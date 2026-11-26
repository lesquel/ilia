<?php
namespace App\Services;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class CursosIlia
{
    public function listar(Request $request): array
    {
        if (! $request->user()?->ilia_user_id) return [];
        if ($request->attributes->has('ilia.courses')) return $request->attributes->get('ilia.courses');
        $encrypted = $request->session()->get('ilia_identity');
        if (! is_string($encrypted)) throw new \App\Exceptions\IdentidadIliaException(401);
        $courses = app(IdentidadIlia::class)->cursos(Crypt::decryptString($encrypted),
            $request->header('X-Correlation-ID') ?: (string) Str::uuid());
        $request->attributes->set('ilia.courses', $courses);
        return $courses;
    }
}
