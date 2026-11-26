<?php
namespace App\Services\Agenda;

class FiltroAgenda
{
    public function motivo(string $tipo, array $datos): ?string
    {
        if ($tipo === 'tarea.fecha_modificada' &&
            ($datos['fecha_anterior'] ?? null) === ($datos['fecha_nueva'] ?? null)) {
            return 'La fecha de vencimiento no cambió.';
        }
        return null;
    }
}
