<?php
namespace App\Services\Agenda;

class EnrutadorAgenda
{
    public function destino(string $tipo): ?string
    {
        return match ($tipo) {
            'tarea.publicada' => 'publicaciones',
            'tarea.fecha_modificada' => 'fechas',
            'entrega.registrada' => 'entregas',
            default => null,
        };
    }
}
