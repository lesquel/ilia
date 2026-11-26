<?php
namespace App\Services\Agenda;
use App\Models\AgendaEvent;
use Illuminate\Support\Facades\Log;
use PhpAmqpLib\Message\AMQPMessage;
use Throwable;

class ConsumidorMensajesAgenda
{
    public function recibir(AMQPMessage $message, string $destino): string
    {
        try {
            $data = json_decode($message->getBody(), true, 512, JSON_THROW_ON_ERROR);
            if (! is_array($data) || ! is_string($data['id'] ?? null)) throw new \RuntimeException('Mensaje inválido.');
            $evento = AgendaEvent::find($data['id']);
            if (! $evento || $evento->destino !== $destino ||
                ($data['tipo'] ?? null) !== $evento->tipo ||
                ($data['correlation_id'] ?? null) !== $evento->correlation_id ||
                ($data['prioridad'] ?? null) !== $evento->prioridad ||
                ($data['datos'] ?? null) !== $evento->datos) throw new \RuntimeException('Contrato no reconocido.');
        } catch (Throwable) {
            $message->reject(false);
            Log::warning('agenda.mensaje_rechazado', ['destino' => $destino]);
            return 'rechazado';
        }
        try {
            app(ProcesadorAgenda::class)->procesar($evento->id, $destino);
        } catch (Throwable $error) {
            $evento->refresh();
            $intentos = $evento->intentos + 1;
            $evento->update(['intentos' => $intentos,
                'estado' => $intentos >= 3 ? 'fallido' : $evento->estado,
                'motivo' => 'No se pudo actualizar la agenda.']);
            Log::warning('agenda.procesamiento_fallido', ['id' => $evento->id,
                'correlation_id' => $evento->correlation_id, 'intento' => $intentos,
                'error_type' => get_class($error)]);
            if ($intentos >= 3) $message->reject(false); else $message->nack(true);
            return 'fallido';
        }
        // Processing transaction has committed before acknowledging the broker.
        $message->ack();
        return 'procesado '.$evento->id.' | '.$destino.' | correlation_id='.$evento->correlation_id;
    }
}
