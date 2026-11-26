<?php
namespace App\Services\Agenda;
use App\Models\User;
use App\Services\AmbitoEjercicios;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LineaTiempo
{
    public function tareas(User $user, Request $request)
    {
        $query = AmbitoEjercicios::query($user)
            ->leftJoin('agenda_items as agenda', 'agenda.exercise_id', '=', 'exercises.id')
            ->where(fn ($q) => $q->whereNotNull('agenda.exercise_id')->orWhere('exercises.agenda_version', 0))
            ->select('exercises.*')->selectRaw('CASE WHEN agenda.exercise_id IS NOT NULL THEN agenda.due_at ELSE exercises.due_at END as timeline_due_at')
            ->selectSub(DB::table('submissions')->selectRaw('COUNT(*)')
                ->whereColumn('exercise_id', 'exercises.id')->where('student_id', $user->id), 'submission_count')
            ->selectSub(DB::table('agenda_deliveries')->select('submission_id')
                ->whereColumn('exercise_id', 'exercises.id')->where('student_id', $user->id)->limit(1), 'agenda_submission_id');
        $data = $request->validate([
            'estado' => ['sometimes', 'in:todos,atrasados,proximos,entregadas'],
            'orden' => ['sometimes', 'in:fecha,curso'], 'q' => ['nullable', 'string', 'max:120'],
        ]);
        $now = CarbonImmutable::now('UTC');
        $items = $query->get()->map(function ($task) use ($now) {
            $task->entregada = $task->agenda_version === 0 ? $task->submission_count > 0 : $task->agenda_submission_id !== null;
            $task->atrasada = ! $task->entregada && $task->timeline_due_at && CarbonImmutable::parse($task->timeline_due_at, 'UTC')->lt($now);
            return $task;
        })->filter(function ($task) use ($data, $now) {
            if (! empty($data['q']) && ! str_contains(mb_strtolower($task->title.' '.($task->course_title ?? '')), mb_strtolower($data['q']))) return false;
            return match ($data['estado'] ?? 'todos') {
                'atrasados' => (bool) $task->atrasada,
                'entregadas' => (bool) $task->entregada,
                'proximos' => ! $task->entregada && $task->timeline_due_at && CarbonImmutable::parse($task->timeline_due_at, 'UTC')->betweenIncluded($now, $now->addDays(7)),
                default => true,
            };
        })->sort(function ($a, $b) use ($data) {
            if (($data['orden'] ?? 'fecha') === 'curso') {
                $cmp = strnatcasecmp($a->course_title ?? 'Sin curso asignado', $b->course_title ?? 'Sin curso asignado');
                if ($cmp !== 0) return $cmp;
            }
            return strcmp($a->timeline_due_at ?? '9999', $b->timeline_due_at ?? '9999') ?: $a->id <=> $b->id;
        })->values();
        return $items;
    }
}
