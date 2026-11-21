<?php

namespace App\Console\Commands;

use App\Services\RabbitMqReportes;
use Illuminate\Console\Command;
use Throwable;

class PrepararColaReportes extends Command
{
    protected $signature = 'reportes:preparar-cola';

    protected $description = 'Comprueba RabbitMQ y prepara la cola de reportes de ILIA';

    public function handle(RabbitMqReportes $broker): int
    {
        $connection = null;
        try {
            $connection = $broker->conectar();
            $channel = $connection->channel();
            $cola = config('reportes.rabbitmq.queue');
            $channel->queue_declare($cola, false, true, false, false);
            $this->info('Conexión con RabbitMQ correcta.');
            $this->info('Cola preparada: '.$cola);
            $channel->close();

            return self::SUCCESS;
        } catch (Throwable) {
            $this->error('No se pudo preparar la cola. Revisa RabbitMQ y la configuración.');

            return self::FAILURE;
        } finally {
            try {
                if ($connection !== null && $connection->isConnected()) {
                    $connection->close();
                }
            } catch (Throwable) {
                // No exponer detalles de conexión ni sustituir el error original.
            }
        }
    }
}
