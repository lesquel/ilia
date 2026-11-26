<?php
namespace App\Console\Commands;
use App\Services\Agenda\ConsumidorMensajesAgenda;
use App\Services\Agenda\RabbitAgenda;
use App\Services\RabbitMqReportes;
use Illuminate\Console\Command;
use Throwable;

class ConsumirAgenda extends Command
{
    protected $signature = 'agenda:consumir {--once : Procesa como máximo un mensaje y termina}';
    protected $description = 'Publica el outbox y atiende los tres consumidores de la línea de tiempo.';
    public function handle(RabbitAgenda $bus, ConsumidorMensajesAgenda $consumer): int
    {
        try {
            $connection = app(RabbitMqReportes::class)->conectar();
            try {
                $channel = $connection->channel();
                $bus->preparar($channel);
                $this->info('Agenda activa: publicaciones, fechas y entregas. Detener: Ctrl+C.');
                do {
                    $bus->publicarPendientes();
                    foreach (config('agenda.queues') as $destino => $cola) {
                        $message = $channel->basic_get($cola, false);
                        if ($message !== null) {
                            $this->line($consumer->recibir($message, $destino));
                            if ($this->option('once')) return self::SUCCESS;
                        }
                    }
                    if ($this->option('once')) break;
                    usleep(400000);
                } while (true);
            } finally { $connection->close(); }
            return self::SUCCESS;
        } catch (Throwable) {
            $this->error('Se perdió la conexión de agenda. Reinicia el comando cuando RabbitMQ esté disponible.');
            return self::FAILURE;
        }
    }
}
