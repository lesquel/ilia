<?php

namespace App\Services;

use App\Models\CodeReport;
use Illuminate\Support\Facades\Log;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use RuntimeException;
use Throwable;

class RabbitMqReportes
{
    public function conectar(): AMQPStreamConnection
    {
        $config = config('reportes.rabbitmq');
        if (empty($config['user']) || empty($config['password'])) {
            throw new RuntimeException('Faltan las credenciales de RabbitMQ.');
        }

        return new AMQPStreamConnection(
            $config['host'], $config['port'], $config['user'], $config['password'],
            $config['vhost'], connection_timeout: 5.0,
            read_write_timeout: 15.0, heartbeat: 5,
        );
    }

    public function publicar(CodeReport $reporte): void
    {
        $connection = $this->conectar();
        try {
            $channel = $connection->channel();
            $cola = config('reportes.rabbitmq.queue');
            $channel->queue_declare($cola, false, true, false, false);
            $mensaje = [
                'message_id' => $reporte->message_id,
                'correlation_id' => $reporte->correlation_id,
                'tipo' => 'reporte_entregas.solicitado',
                'ocurrido_en' => $reporte->created_at->toISOString(),
                'payload' => ['reporte_id' => $reporte->id, 'tarea_id' => $reporte->exercise_id],
            ];
            $confirmado = false;
            $devuelto = false;
            $channel->confirm_select();
            $channel->set_ack_handler(function (AMQPMessage $mensaje) use (&$confirmado): void {
                $confirmado = true;
            });
            $channel->set_nack_handler(function (AMQPMessage $mensaje): void {
                throw new RuntimeException('RabbitMQ rechazó el mensaje.');
            });
            $channel->set_return_listener(function () use (&$devuelto): void {
                $devuelto = true;
            });
            $channel->basic_publish(new AMQPMessage(json_encode($mensaje, JSON_THROW_ON_ERROR), [
                'content_type' => 'application/json', 'delivery_mode' => 2,
                'message_id' => $reporte->message_id,
                'correlation_id' => $reporte->correlation_id,
                'type' => 'reporte_entregas.solicitado',
            ]), '', $cola, true);
            $channel->wait_for_pending_acks_returns(5.0);
            if (! $confirmado || $devuelto) {
                throw new RuntimeException('No se confirmó la recepción en la cola.');
            }
            Log::info('reporte.publicado', [
                'report_id' => $reporte->id, 'message_id' => $reporte->message_id,
                'correlation_id' => $reporte->correlation_id, 'estado' => 'publicado',
            ]);
            $channel->close();
        } finally {
            try {
                if ($connection->isConnected()) {
                    $connection->close();
                }
            } catch (Throwable) {
                // No sustituir el resultado de publicación por un error de limpieza.
            }
        }
    }
}
