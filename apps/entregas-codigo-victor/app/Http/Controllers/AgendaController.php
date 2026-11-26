<?php
namespace App\Http\Controllers;

use App\Models\AgendaEvent;
use App\Services\Agenda\FlujoAgenda;
use App\Services\AmbitoEjercicios;
use App\Services\CursosIlia;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AgendaController extends Controller
{
    public function cursos(Request $request, CursosIlia $cursos)
    {
        abort_unless($request->user()->role === 'instructor', 403);
        return response()->json(['courses' => $cursos->listar($request)])->header('Cache-Control', 'no-store');
    }

    public function fecha(Request $request, int $id, FlujoAgenda $flujo)
    {
        abort_unless($request->user()->role === 'instructor', 403);
        $data = $request->validate(['due_at' => ['nullable', 'date_format:Y-m-d\TH:i']]);
        $fecha = empty($data['due_at']) ? null : CarbonImmutable::createFromFormat(
            'Y-m-d\TH:i', $data['due_at'], config('agenda.timezone'))->utc()->format('Y-m-d H:i:s');
        $event = $flujo->cambiarFecha($request->user(), $id, $fecha);
        return back()->with('success', $event->estado === 'filtrado'
            ? 'La fecha no cambió; no se envió una actualización a la agenda.'
            : 'Fecha guardada. La agenda se actualizará en segundo plano.');
    }

    public function evento(Request $request, FlujoAgenda $flujo)
    {
        $data = $request->validate([
            'id' => ['required', 'uuid'], 'correlation_id' => ['required', 'uuid'],
            'tipo' => ['required', 'string', 'max:80'],
            'prioridad' => ['required', 'in:baja,normal,alta'],
            'datos' => ['required', 'array:tarea_id,entrega_id,fecha_nueva'],
            'datos.tarea_id' => ['required', 'integer:strict', 'min:1'],
            'datos.entrega_id' => ['sometimes', 'integer:strict', 'min:1'],
            'datos.fecha_nueva' => ['sometimes', 'nullable', 'date'],
        ]);
        $user = $request->user();
        $task = AmbitoEjercicios::query($user)->where('exercises.id', $data['datos']['tarea_id'])->first();
        abort_unless($task, 404);
        if ($data['tipo'] === 'entrega.registrada') {
            $submission = DB::table('submissions')->find($data['datos']['entrega_id'] ?? 0);
            abort_unless($submission && $submission->exercise_id === $task->id &&
                (($user->role === 'student' && $submission->student_id === $user->id) ||
                 ($user->role === 'instructor' && $task->instructor_id === $user->id)), 403);
        } else {
            abort_unless($user->role === 'instructor' && $task->instructor_id === $user->id, 403);
        }
        abort_if(AgendaEvent::whereKey($data['id'])->exists(), 409, 'El identificador del evento ya fue utilizado.');
        $event = DB::transaction(function () use ($data, $task, $user, $flujo) {
            if ($data['tipo'] === 'tarea.fecha_modificada') {
                if (! array_key_exists('fecha_nueva', $data['datos'])) {
                    throw ValidationException::withMessages(['datos.fecha_nueva' => 'Indica la nueva fecha o null.']);
                }
                $raw = $data['datos']['fecha_nueva'];
                if ($raw !== null && ! preg_match('/(Z|[+-]\d{2}:\d{2})$/', $raw)) {
                    throw ValidationException::withMessages(['datos.fecha_nueva' => 'Usa ISO 8601 con zona horaria.']);
                }
                $fecha = $raw === null ? null : CarbonImmutable::parse($raw)->utc()->format('Y-m-d H:i:s');
                return $flujo->cambiarFecha($user, $task->id, $fecha, $data['id'], $data['correlation_id'], $data['prioridad']);
            }
            $extra = $data['tipo'] === 'entrega.registrada' ? ['entrega_id' => $data['datos']['entrega_id']] : [];
            return $flujo->registrar($data['tipo'], $user, $task, $extra,
                $data['id'], $data['correlation_id'], $data['prioridad']);
        });
        return $this->respuesta($event, in_array($event->estado, ['filtrado', 'no_enrutable']) ? 200 : 202);
    }

    public function show(Request $request, string $id)
    {
        $event = AgendaEvent::findOrFail($id);
        $user = $request->user();
        $owned = $user->role === 'instructor' && DB::table('exercises')
            ->where('id', $event->exercise_id)->where('instructor_id', $user->id)->exists();
        abort_unless($event->actor_id === $user->id || $owned, 404);
        return $this->respuesta($event, 200);
    }

    private function respuesta(AgendaEvent $event, int $status)
    {
        return response()->json(['data' => [
            'id' => $event->id, 'correlation_id' => $event->correlation_id,
            'tipo' => $event->tipo, 'prioridad' => $event->prioridad,
            'estado' => $event->estado, 'destino' => $event->destino,
            'cola' => $event->destino ? config('agenda.queues.'.$event->destino) : null,
            'motivo' => $event->motivo, 'datos' => $event->datos,
            'procesado_en' => $event->processed_at?->toISOString(),
        ]], $status)->header('Cache-Control', 'no-store')->header('X-Correlation-ID', $event->correlation_id);
    }
}
