<?php
namespace App\Services\Agenda;
use App\Models\AgendaEvent;
use Illuminate\Support\Facades\DB;

class ConsumidorEntrega
{
    public function procesar(AgendaEvent $evento): void
    {
        $entrega = DB::table('submissions')->find($evento->datos['entrega_id']);
        if (! $entrega || $entrega->exercise_id !== $evento->exercise_id) {
            throw new \RuntimeException('Entrega no disponible.');
        }
        DB::table('agenda_deliveries')->insertOrIgnore([
            'exercise_id' => $entrega->exercise_id, 'student_id' => $entrega->student_id,
            'submission_id' => $entrega->id, 'submitted_at' => $entrega->submitted_at,
        ]);
        DB::table('agenda_deliveries')->where('exercise_id', $entrega->exercise_id)
            ->where('student_id', $entrega->student_id)->where('submission_id', '<', $entrega->id)
            ->update(['submission_id' => $entrega->id, 'submitted_at' => $entrega->submitted_at]);
    }
}
