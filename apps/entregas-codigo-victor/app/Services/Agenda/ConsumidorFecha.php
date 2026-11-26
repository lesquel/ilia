<?php
namespace App\Services\Agenda;
use App\Models\AgendaEvent;
use Illuminate\Support\Facades\DB;
use Carbon\CarbonImmutable;

class ConsumidorFecha
{
    public function procesar(AgendaEvent $evento): void
    {
        $d = $evento->datos;
        $due = $d['fecha_nueva'] ? CarbonImmutable::parse($d['fecha_nueva'])->utc()->format('Y-m-d H:i:s') : null;
        // Bootstrap if a deadline change arrives before the publication event.
        DB::table('agenda_items')->insertOrIgnore([
            'exercise_id' => $evento->exercise_id, 'title' => $d['titulo'],
            'course_title' => $d['curso'], 'due_at' => $due, 'version' => $d['version'],
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('agenda_items')->where('exercise_id', $evento->exercise_id)
            ->where('version', '<=', $d['version'])
            ->update(['due_at' => $due, 'version' => $d['version'], 'updated_at' => now()]);
    }
}
