<?php
namespace App\Console\Commands;
use App\Services\Agenda\RabbitAgenda;
use App\Services\RabbitMqReportes;
use Illuminate\Console\Command;
use Throwable;

class PublicarAgenda extends Command
{
    protected $signature = 'agenda:publicar';
    protected $description = 'Declara las tres colas y publica los eventos pendientes de la agenda.';
    public function handle(RabbitAgenda $bus): int
    {
        try {
            $connection = app(RabbitMqReportes::class)->conectar();
            try { $channel = $connection->channel(); $bus->preparar($channel); $channel->close(); }
            finally { $connection->close(); }
            $this->info('Eventos publicados: '.$bus->publicarPendientes());
            foreach (config('agenda.queues') as $cola) $this->line($cola);
            return self::SUCCESS;
        } catch (Throwable) {
            $this->error('RabbitMQ no está disponible. Los eventos permanecen pendientes en la base de datos.');
            return self::FAILURE;
        }
    }
}
