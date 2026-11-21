<?php

namespace App\Services;

use App\Data\CodeSubmission;
use App\Models\CodeReport;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class GeneradorReporteEntregas
{
    public function generar(CodeReport $reporte): array
    {
        $archivo = tmpfile();
        if ($archivo === false) {
            throw new RuntimeException('No se pudo preparar el archivo temporal.');
        }
        try {
            if (fwrite($archivo, "\xEF\xBB\xBF") === false) {
                throw new RuntimeException('No se pudo escribir el encabezado.');
            }
            $this->escribirFila($archivo, [
                'Entrega', 'Estudiante', 'Fecha de entrega (UTC)',
                'Versiones registradas', 'Eventos de pegado',
                'Mayor pegado (caracteres)', 'Uso de IA declarado',
            ]);
            $entregas = DB::table('submissions')
                ->join('users', 'users.id', '=', 'submissions.student_id')
                ->where('submissions.exercise_id', $reporte->exercise_id)
                ->where('submissions.id', '<=', $reporte->last_submission_id)
                ->orderBy('submissions.id')
                ->select('submissions.id', 'users.name', 'submissions.submitted_at',
                    'submissions.history', 'submissions.ai_usage')
                ->cursor();
            $cantidad = 0;
            foreach ($entregas as $entrega) {
                $historial = json_decode($entrega->history, true, flags: JSON_THROW_ON_ERROR);
                if (! is_array($historial)) {
                    throw new RuntimeException('El historial no tiene un formato válido.');
                }
                $resumen = CodeSubmission::summary($historial);
                $usoIA = match ($entrega->ai_usage) {
                    'none' => 'Sin uso declarado',
                    'consultation' => 'Consulta',
                    'generation' => 'Generación',
                    default => 'Sin especificar',
                };
                $this->escribirFila($archivo, [
                    $entrega->id, $entrega->name, $entrega->submitted_at,
                    $resumen['step_count'], $resumen['paste_count'],
                    $resumen['largest_paste_chars'], $usoIA,
                ]);
                $cantidad++;
            }
            if (! rewind($archivo)) {
                throw new RuntimeException('No se pudo leer el CSV generado.');
            }
            $ruta = 'reportes-entregas/'.$reporte->id.'.csv';
            $guardado = Storage::build([
                'driver' => 'local', 'root' => storage_path('app/private'), 'throw' => true,
            ])->put($ruta, $archivo);
            if (! $guardado) {
                throw new RuntimeException('No se pudo guardar el reporte.');
            }

            return ['file_path' => $ruta, 'row_count' => $cantidad];
        } finally {
            fclose($archivo);
        }
    }

    private function escribirFila($archivo, array $valores): void
    {
        $valores = array_map(function ($valor): string {
            $texto = (string) $valor;

            return preg_match('/^[\s]*[=+\-@]/u', $texto) ? "'".$texto : $texto;
        }, $valores);
        if (fputcsv($archivo, $valores, ';', '"', '') === false) {
            throw new RuntimeException('No se pudo escribir una fila del reporte.');
        }
    }
}
