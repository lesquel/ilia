<?php

namespace App\Console\Commands;

use App\Models\CodeReport;
use App\Services\ProcesadorReporteEntregas;
use App\Services\RabbitMqReportes;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use PhpAmqpLib\Exception\AMQPTimeoutException;
use PhpAmqpLib\Message\AMQPMessage;
use Throwable;

class ConsumirReportes extends Command
{
    protected $signature = 'reportes:consumir
        {--once : Procesar una entrega del broker y salir}
        {--recuperar-interrumpidos : Restablecer trabajos processing; usar solo con los demás consumidores detenidos}';

    protected $description = 'Consume solicitudes de reportes desde RabbitMQ con confirmación manual';

    public function handle(RabbitMqReportes $broker, ProcesadorReporteEntregas $procesador): int
    {
        if ($this->option('recuperar-interrumpidos')) {
            $n = CodeReport::where('mode', 'async')->where('status', 'processing')->update([
                'status' => 'pending', 'updated_at' => now(),
            ]);
            $this->warn("Trabajos interrumpidos restablecidos: {$n}. No debe haber otro consumidor activo.");
        }
        $connection = null;
        $salir = false;
        $fallo = false;
        try {
            $connection = $broker->conectar();
            $channel = $connection->channel();
            $cola = config('reportes.rabbitmq.queue');
            $channel->queue_declare($cola, false, true, false, false);
            $channel->basic_qos(0, 1, false);
            $channel->basic_consume($cola, '', false, false, false, false,
                function (AMQPMessage $mensaje) use ($procesador, &$salir, &$fallo): void {
                    $reporte = null;
                    try {
                        $datos = json_decode($mensaje->getBody(), true, flags: JSON_THROW_ON_ERROR);
                        if (! is_array($datos) || ! $this->mensajeValido($datos)) {
                            throw new \UnexpectedValueException('Mensaje inválido.');
                        }
                        $reporte = CodeReport::find($datos['payload']['reporte_id']);
                        if (! $reporte || $reporte->mode !== 'async'
                            || $reporte->message_id !== $datos['message_id']
                            || $reporte->correlation_id !== $datos['correlation_id']
                            || $reporte->exercise_id !== $datos['payload']['tarea_id']) {
                            throw new \UnexpectedValueException('El mensaje no coincide con el reporte.');
                        }
                    } catch (Throwable $error) {
                        Log::warning('reporte.mensaje_rechazado', ['estado' => 'rechazado', 'error_type' => $error::class]);
                        $this->warn('Mensaje inválido o incoherente rechazado, sin reencolar.');
                        $mensaje->reject(false);
                        $salir = (bool) $this->option('once');

                        return;
                    }
                    try {
                        $resultado = $procesador->procesar($reporte->id);
                        if ($resultado === null) {
                            $mensaje->nack(true);
                            $this->warn('Trabajo en curso. Se reencoló; detén los demás consumidores antes de recuperar un trabajo interrumpido.');
                            $salir = true;
                            $fallo = true;

                            return;
                        }
                        // Confirmar solo después de guardar CSV y estado completed.
                        $mensaje->ack();
                        $this->info('COMPLETADO '.$resultado->id.' | correlation_id='.$resultado->correlation_id);
                    } catch (Throwable $error) {
                        $actual = CodeReport::find($reporte->id);
                        if ($actual && $actual->status === 'failed' && $actual->attempts >= 3) {
                            $mensaje->reject(false);
                            $this->error('FALLIDO '.$actual->id.' | correlation_id='.$actual->correlation_id.' | 3 intentos agotados.');
                        } elseif ($actual && $actual->status === 'failed') {
                            $mensaje->nack(true);
                            $this->warn('Reencolado '.$actual->id.' | correlation_id='.$actual->correlation_id);
                        } else {
                            // Error de infraestructura o confirmación: conservar el mensaje y salir.
                            $salir = true;
                            $fallo = true;
                            $this->error('El consumidor se detuvo. Revisa la conexión y el estado antes de reiniciarlo.');
                        }
                    }
                    $salir = $salir || (bool) $this->option('once');
                });
            $this->info('Esperando mensajes en '.$cola.'. Detener: Ctrl+C.');
            while ($channel->is_consuming() && ! $salir) {
                try {
                    $channel->wait(null, false, 1.0);
                } catch (AMQPTimeoutException) {
                    // Mantener activo el consumidor cuando la cola está vacía.
                }
            }
        } catch (Throwable $error) {
            Log::warning('reporte.consumidor_detenido', ['estado' => 'detenido', 'error_type' => $error::class]);
            $this->error('No se pudo mantener el consumidor. Revisa RabbitMQ y la configuración.');
            $fallo = true;
        } finally {
            try {
                if ($connection !== null && $connection->isConnected()) {
                    $connection->close();
                }
            } catch (Throwable) {
                // RabbitMQ reentregará los mensajes sin confirmar al cerrarse la conexión.
            }
        }

        return $fallo ? self::FAILURE : self::SUCCESS;
    }

    public function mensajeValido(array $datos): bool
    {
        return ! Validator::make($datos, [
            'message_id' => ['required', 'uuid'], 'correlation_id' => ['required', 'uuid'],
            'tipo' => ['required', 'in:reporte_entregas.solicitado'],
            'ocurrido_en' => ['required', 'date'],
            'payload' => ['required', 'array:reporte_id,tarea_id'],
            'payload.reporte_id' => ['required', 'uuid'],
            'payload.tarea_id' => ['required', 'integer:strict', 'min:1'],
        ])->fails();
    }
}
