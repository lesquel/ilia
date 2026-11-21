<?php

namespace App\Http\Controllers;

use App\Models\CodeReport;
use App\Services\ProcesadorReporteEntregas;
use App\Services\RabbitMqReportes;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Throwable;

class ReporteEntregasController extends Controller
{
    public function store(Request $request, RabbitMqReportes $broker): JsonResponse
    {
        $reporte = $this->crear($request, 'async');
        try {
            $broker->publicar($reporte);
        } catch (Throwable $error) {
            // Una desconexión puede impedir recibir la confirmación aunque el mensaje haya llegado.
            // No sobrescribir un procesamiento que ya haya empezado en el consumidor.
            CodeReport::whereKey($reporte->id)->where('status', 'pending')->update([
                'status' => 'failed', 'error_message' => 'No se pudo confirmar la publicación en RabbitMQ.',
                'updated_at' => now(),
            ]);
            Log::warning('reporte.publicacion_no_confirmada', [
                'report_id' => $reporte->id, 'correlation_id' => $reporte->correlation_id,
                'estado' => 'publicacion_no_confirmada', 'error_type' => $error::class,
            ]);

            return $this->respuesta($reporte->refresh(), 503,
                'No se pudo confirmar la publicación. Consulta el estado antes de volver a solicitarlo.');
        }

        return $this->respuesta($reporte->refresh(), 202, 'Solicitud aceptada para procesamiento.');
    }

    public function sincrono(Request $request, ProcesadorReporteEntregas $procesador): JsonResponse
    {
        $reporte = $this->crear($request, 'sync');
        try {
            $resultado = $procesador->procesar($reporte->id);
            if ($resultado === null) {
                return $this->respuesta($reporte->refresh(), 409, 'El reporte ya está en procesamiento.');
            }

            return $this->respuesta($resultado, 201, 'Reporte generado durante la petición.');
        } catch (Throwable) {
            return $this->respuesta($reporte->refresh(), 500, 'No se pudo generar el reporte.');
        }
    }

    public function index(Request $request, int $id): JsonResponse
    {
        $this->tareaPropia($request, $id);
        $reportes = CodeReport::where('exercise_id', $id)
            ->where('requested_by', $request->user()->id)
            ->orderByDesc('created_at')->orderByDesc('id')->limit(20)->get();

        return response()->json(['data' => $reportes->map(fn ($r) => $this->datos($r))])
            ->header('Cache-Control', 'no-store');
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return $this->respuesta($this->reportePropio($request, $id), 200);
    }

    public function descargar(Request $request, string $id)
    {
        $reporte = $this->reportePropio($request, $id);
        abort_unless($reporte->status === 'completed', 409, 'El reporte todavía no está disponible.');
        $ruta = 'reportes-entregas/'.$reporte->id.'.csv';
        abort_unless($reporte->file_path === $ruta, 404);
        $disk = Storage::build(['driver' => 'local', 'root' => storage_path('app/private')]);
        abort_unless($disk->exists($ruta), 404, 'No se encontró el archivo.');

        return $disk->download($ruta, 'ILIA_tarea_'.$reporte->exercise_id.'_'.$reporte->id.'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function crear(Request $request, string $modo): CodeReport
    {
        abort_unless($request->user()->role === 'instructor', 403);
        $data = $request->validate(['exercise_id' => ['required', 'integer:strict', 'min:1']]);
        $this->tareaPropia($request, $data['exercise_id']);
        $correlation = $request->header('X-Correlation-ID');
        if ($correlation !== null) {
            Validator::make(['correlation_id' => $correlation], [
                'correlation_id' => ['required', 'string', 'uuid'],
            ])->validate();
        }
        $reporte = CodeReport::create([
            'id' => (string) Str::uuid(), 'message_id' => (string) Str::uuid(),
            'correlation_id' => $correlation ?? (string) Str::uuid(),
            'exercise_id' => $data['exercise_id'], 'requested_by' => $request->user()->id,
            'mode' => $modo, 'status' => 'pending',
            'last_submission_id' => (int) (DB::table('submissions')
                ->where('exercise_id', $data['exercise_id'])->max('id') ?? 0),
        ]);
        Log::info('reporte.recibido', [
            'report_id' => $reporte->id, 'message_id' => $reporte->message_id,
            'correlation_id' => $reporte->correlation_id, 'estado' => 'pendiente', 'modo' => $modo,
        ]);

        return $reporte;
    }

    private function tareaPropia(Request $request, int $id): void
    {
        abort_unless($request->user()->role === 'instructor', 403);
        abort_unless(DB::table('exercises')->where('id', $id)
            ->where('instructor_id', $request->user()->id)->exists(), 404);
    }

    private function reportePropio(Request $request, string $id): CodeReport
    {
        abort_unless($request->user()->role === 'instructor', 403);
        $reporte = CodeReport::whereKey($id)->where('requested_by', $request->user()->id)->firstOrFail();
        $this->tareaPropia($request, $reporte->exercise_id);

        return $reporte;
    }

    private function respuesta(CodeReport $reporte, int $status, ?string $mensaje = null): JsonResponse
    {
        $body = ['data' => $this->datos($reporte)];
        if ($mensaje !== null) {
            $body['message'] = $mensaje;
        }

        return response()->json($body, $status)
            ->header('X-Correlation-ID', $reporte->correlation_id)
            ->header('Cache-Control', 'no-store');
    }

    private function datos(CodeReport $r): array
    {
        $labels = ['pending' => 'Pendiente', 'processing' => 'Procesando',
            'completed' => 'Disponible', 'failed' => 'Fallido'];

        return [
            'id' => $r->id, 'message_id' => $r->message_id,
            'correlation_id' => $r->correlation_id, 'exercise_id' => $r->exercise_id,
            'mode' => $r->mode, 'status' => $r->status,
            'status_label' => $labels[$r->status] ?? $r->status,
            'attempts' => $r->attempts, 'row_count' => $r->row_count,
            'created_at' => $r->created_at?->toISOString(),
            'started_at' => $r->started_at?->toISOString(),
            'completed_at' => $r->completed_at?->toISOString(),
            'error_message' => $r->error_message,
            'status_url' => route('module.reports.show', $r->id),
            'download_url' => $r->status === 'completed' ? route('module.reports.download', $r->id) : null,
        ];
    }
}
