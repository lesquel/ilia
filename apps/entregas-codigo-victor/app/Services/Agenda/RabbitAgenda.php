<?php
namespace App\Services\Agenda;
use App\Models\AgendaEvent;
use App\Services\RabbitMqReportes;
use Illuminate\Support\Facades\Log;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Message\AMQPMessage;
use Throwable;

class RabbitAgenda
{
    public function preparar(AMQPChannel $channel): void
    {
        $exchange = config('agenda.exchange');
        $channel->exchange_declare($exchange, 'direct', false, true, false);
        foreach (['tarea.publicada', 'tarea.fecha_modificada', 'entrega.registrada'] as $tipo) {
            $destino = app(EnrutadorAgenda::class)->destino($tipo);
            $cola = config('agenda.queues.'.$destino);
            $channel->queue_declare($cola, false, true, false, false);
            $channel->queue_bind($cola, $exchange, $tipo);
        }
    }

    public function publicarEvento(AgendaEvent $evento): void
    {
        $connection = app(RabbitMqReportes::class)->conectar();
        try {
            $channel = $connection->channel();
            $this->preparar($channel);
            $confirmed = false;
            $returned = false;
            $channel->confirm_select();
            $channel->set_ack_handler(function () use (&$confirmed) { $confirmed = true; });
            $channel->set_nack_handler(function () { throw new \RuntimeException('Publicación no confirmada.'); });
            $channel->set_return_listener(function () use (&$returned) { $returned = true; });
            $body = ['id' => $evento->id, 'correlation_id' => $evento->correlation_id,
                'tipo' => $evento->tipo, 'prioridad' => $evento->prioridad, 'datos' => $evento->datos];
            $channel->basic_publish(new AMQPMessage(json_encode($body, JSON_THROW_ON_ERROR), [
                'content_type' => 'application/json', 'delivery_mode' => 2,
                'message_id' => $evento->id, 'correlation_id' => $evento->correlation_id,
            ]), config('agenda.exchange'), $evento->tipo, true);
            $channel->wait_for_pending_acks_returns(5.0);
            if (! $confirmed || $returned) throw new \RuntimeException('No se confirmó el destino.');
            AgendaEvent::whereKey($evento->id)->where('estado', 'pendiente')->update([
                'estado' => 'publicado', 'published_at' => now(), 'motivo' => null,
            ]);
            Log::info('agenda.publicado', ['id' => $evento->id, 'correlation_id' => $evento->correlation_id,
                'exchange' => config('agenda.exchange'), 'routing_key' => $evento->tipo,
                'cola' => config('agenda.queues.'.$evento->destino)]);
            $channel->close();
        } finally {
            try { $connection->close(); } catch (Throwable) { /* Preserve publication outcome. */ }
        }
    }

    public function publicarPendientes(): int
    {
        $count = 0;
        foreach (AgendaEvent::where('estado', 'pendiente')->orderBy('created_at')->limit(30)->get() as $evento) {
            try {
                $this->publicarEvento($evento);
                $count++;
            } catch (Throwable $error) {
                $evento->update(['motivo' => 'Publicación pendiente: broker no disponible o sin confirmación.']);
                Log::warning('agenda.transporte_pendiente', ['id' => $evento->id,
                    'correlation_id' => $evento->correlation_id, 'error_type' => get_class($error)]);
                break;
            }
        }
        return $count;
    }
}
