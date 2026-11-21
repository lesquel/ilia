<?php

namespace App\Exceptions;

use RuntimeException;

class IdentidadIliaException extends RuntimeException
{
    public function __construct(public readonly int $status)
    {
        parent::__construct($status === 401
            ? 'Tu acceso al módulo venció o la cuenta ya no está disponible. Vuelve a entrar desde ILIA.'
            : 'No se pudo validar tu cuenta con ILIA. Inténtalo nuevamente cuando el servicio esté disponible.');
    }
}
