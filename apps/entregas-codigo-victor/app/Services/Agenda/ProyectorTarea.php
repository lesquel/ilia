<?php
namespace App\Services\Agenda;
use App\Models\AgendaEvent;
use Illuminate\Support\Facades\DB;

class ProyectorTarea
{
    public function actualizar(AgendaEvent $evento): void
    {
        $d = $evento->datos;
        $d['fecha_nueva'] = $d['fecha_nueva'] ? \Carbon\CarbonImmutable::parse($d['fecha_nueva'])->utc()->format('Y-m-d H:i:s') : null;
        DB::table('agenda_items')->insertOrIgnore([
            'exercise_id' => $evento->exercise_id, 'title' => $d['titulo'],
            'course_title' => $d['curso'], 'due_at' => $d['fecha_nueva'],
            'version' => $d['version'], 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('agenda_items')->where('exercise_id', $evento->exercise_id)
            ->where('version', '<=', $d['version'])->update([
                'title' => $d['titulo'], 'course_title' => $d['curso'],
                'due_at' => $d['fecha_nueva'], 'version' => $d['version'], 'updated_at' => now(),
            ]);
    }
}
