<?php
namespace App\Services\Agenda;

use App\Models\AgendaEvent;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class FlujoAgenda
{
    public function registrar(string $tipo, User $actor, object $tarea, array $extra = [],
        ?string $id = null, ?string $correlation = null, string $priority = 'normal'): AgendaEvent
    {
        $datos = ['tarea_id' => (int) $tarea->id, 'version' => (int) $tarea->agenda_version,
            'titulo' => $tarea->title, 'curso' => $tarea->course_title,
            'fecha_nueva' => self::iso($tarea->due_at), ...$extra];
        $destino = app(EnrutadorAgenda::class)->destino($tipo);
        $motivo = app(FiltroAgenda::class)->motivo($tipo, $datos);
        $estado = $destino === null ? 'no_enrutable' : ($motivo ? 'filtrado' : 'pendiente');
        $evento = AgendaEvent::create([
            'id' => $id ?? (string) Str::uuid(), 'correlation_id' => $correlation ?? (string) Str::uuid(),
            'actor_id' => $actor->id, 'exercise_id' => $tarea->id,
            'tipo' => $tipo, 'prioridad' => $priority, 'destino' => $motivo ? null : $destino,
            'datos' => $datos, 'estado' => $estado,
            'motivo' => $destino === null ? 'Tipo de evento no reconocido; requiere revisión.' : $motivo,
        ]);
        Log::info('agenda.'.$estado, ['id' => $evento->id, 'correlation_id' => $evento->correlation_id,
            'tipo' => $tipo, 'destino' => $evento->destino, 'motivo' => $evento->motivo]);
        return $evento;
    }

    public static function iso(?string $fecha): ?string
    {
        return $fecha === null ? null : CarbonImmutable::parse($fecha, 'UTC')->utc()->format('Y-m-d\TH:i:s\Z');
    }

    public function cambiarFecha(User $actor, int $taskId, ?string $fecha, ?string $id = null,
        ?string $correlation = null, string $priority = 'normal'): AgendaEvent
    {
        return DB::transaction(function () use ($actor, $taskId, $fecha, $id, $correlation, $priority) {
            $task = DB::table('exercises')->where('id', $taskId)->lockForUpdate()->first();
            abort_unless($task && $task->instructor_id === $actor->id && $actor->role === 'instructor', 404);
            $antes = self::iso($task->due_at);
            $despues = self::iso($fecha);
            if ($antes !== $despues) {
                DB::table('exercises')->where('id', $taskId)->update([
                    'due_at' => $fecha, 'agenda_version' => $task->agenda_version + 1,
                ]);
                $task = DB::table('exercises')->find($taskId);
            }
            return $this->registrar('tarea.fecha_modificada', $actor, $task,
                ['fecha_anterior' => $antes, 'fecha_nueva' => $despues], $id, $correlation, $priority);
        });
    }
}
