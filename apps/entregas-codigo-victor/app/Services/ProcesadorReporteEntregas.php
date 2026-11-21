<?php

namespace App\Services;

use App\Models\CodeReport;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class ProcesadorReporteEntregas
{
    public function __construct(private GeneradorReporteEntregas $generador) {}

    public function procesar(string $id): ?CodeReport
    {
        $reporte = CodeReport::findOrFail($id);
        if ($reporte->status === 'completed') {
            return $reporte; // Una reentrega de RabbitMQ no regenera el resultado.
        }
        if ($reporte->status === 'processing') {
            return null;
        }
        if ($reporte->attempts >= 3) {
            $reporte->update(['status' => 'failed', 'completed_at' => now(),
                'error_message' => 'Se agotaron los tres intentos de procesamiento. Solicita un nuevo reporte.']);
            throw new RuntimeException('Se agotaron los intentos del reporte.');
        }
        $tomado = CodeReport::whereKey($id)->whereIn('status', ['pending', 'failed'])
            ->where('attempts', '<', 3)->update([
                'status' => 'processing', 'attempts' => DB::raw('attempts + 1'),
                'started_at' => now(), 'completed_at' => null,
                'error_message' => null, 'updated_at' => now(),
            ]);
        if (! $tomado) {
            return null; // Ya existe un procesamiento en curso.
        }
        $reporte->refresh();
        try {
            $this->registrar($reporte, 'procesando');
            $resultado = $this->generador->generar($reporte);
            $reporte->update($resultado + [
                'status' => 'completed', 'completed_at' => now(), 'error_message' => null,
            ]);
            $this->registrar($reporte, 'completado');

            return $reporte->refresh();
        } catch (Throwable $error) {
            $reporte->update([
                'status' => 'failed', 'completed_at' => now(),
                'error_message' => 'No se pudo generar el reporte. Revisa el consumidor y vuelve a solicitarlo.',
            ]);
            Log::warning('reporte.fallido', [
                'report_id' => $reporte->id, 'correlation_id' => $reporte->correlation_id,
                'estado' => 'fallido', 'intento' => $reporte->attempts,
                'error_type' => $error::class,
            ]);
            throw $error;
        }
    }

    private function registrar(CodeReport $reporte, string $estado): void
    {
        Log::info('reporte.'.$estado, [
            'report_id' => $reporte->id, 'message_id' => $reporte->message_id,
            'correlation_id' => $reporte->correlation_id,
            'estado' => $estado, 'intento' => $reporte->attempts,
        ]);
    }
}
