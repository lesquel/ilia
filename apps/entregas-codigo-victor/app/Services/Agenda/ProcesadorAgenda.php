<?php
namespace App\Services\Agenda;
use App\Models\AgendaEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ProcesadorAgenda
{
    public function procesar(string $id, string $destino): void
    {
        DB::transaction(function () use ($id, $destino) {
            $evento = AgendaEvent::whereKey($id)->lockForUpdate()->first();
            if (! $evento || $evento->destino !== $destino ||
                app(EnrutadorAgenda::class)->destino($evento->tipo) !== $destino ||
                in_array($evento->estado, ['filtrado', 'no_enrutable', 'fallido'], true)) {
                throw new RuntimeException('Mensaje no apto para este consumidor.');
            }
            if ($evento->estado === 'procesado') return;
            $consumidor = match ($destino) {
                'publicaciones' => ConsumidorPublicacion::class,
                'fechas' => ConsumidorFecha::class,
                'entregas' => ConsumidorEntrega::class,
                default => throw new RuntimeException('Destino desconocido.'),
            };
            app($consumidor)->procesar($evento);
            $evento->update(['estado' => 'procesado', 'processed_at' => now(), 'motivo' => null]);
            Log::info('agenda.procesado', ['id' => $id, 'correlation_id' => $evento->correlation_id,
                'consumidor' => $consumidor, 'destino' => $destino]);
        });
    }
}
