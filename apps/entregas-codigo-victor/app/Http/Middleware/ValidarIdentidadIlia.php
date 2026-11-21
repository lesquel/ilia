<?php

namespace App\Http\Middleware;

use App\Exceptions\IdentidadIliaException;
use App\Services\IdentidadIlia;
use Closure;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class ValidarIdentidadIlia
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user?->ilia_user_id || $request->is('acceso/*', 'up')) {
            return $next($request);
        }
        $correlation = Str::isUuid($request->header('X-Correlation-ID', ''))
            ? $request->header('X-Correlation-ID') : (string) Str::uuid();
        $request->headers->set('X-Correlation-ID', $correlation);
        try {
            $encrypted = $request->session()->get('ilia_identity');
            if (! is_string($encrypted)) {
                throw new IdentidadIliaException(401);
            }
            $identity = app(IdentidadIlia::class);
            $result = $identity->verificar(Crypt::decryptString($encrypted), $correlation);
            if (strtolower($result['user']['id']) !== $user->ilia_user_id) {
                throw new IdentidadIliaException(401);
            }
            $current = $identity->sincronizar($result['user']);
            Auth::setUser($current);
        } catch (DecryptException) {
            $this->cerrar($request);
            throw new IdentidadIliaException(401);
        } catch (IdentidadIliaException $error) {
            Log::warning('ilia.modulo.validacion_fallida', ['correlation_id' => $correlation, 'status' => $error->status]);
            if ($error->status === 401) {
                $this->cerrar($request);
            }
            throw $error;
        }
        $response = $next($request);
        $response->headers->set('X-Correlation-ID', $correlation);
        $response->headers->set('Cache-Control', 'no-store');

        return $response;
    }

    private function cerrar(Request $request): void
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
