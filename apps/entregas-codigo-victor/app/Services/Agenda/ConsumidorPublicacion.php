<?php
namespace App\Services\Agenda;
use App\Models\AgendaEvent;
class ConsumidorPublicacion
{
    public function procesar(AgendaEvent $evento): void
    {
        app(ProyectorTarea::class)->actualizar($evento);
    }
}
