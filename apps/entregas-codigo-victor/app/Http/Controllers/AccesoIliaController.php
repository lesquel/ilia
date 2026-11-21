<?php

namespace App\Http\Controllers;

use App\Services\IdentidadIlia;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AccesoIliaController extends Controller
{
    public function entrar(Request $request, IdentidadIlia $identity): JsonResponse
    {
        $data = $request->validate(['ticket' => ['required', 'string', 'max:4096']]);
        $correlation = Str::isUuid($request->header('X-Correlation-ID', ''))
            ? $request->header('X-Correlation-ID') : (string) Str::uuid();
        $result = $identity->intercambiar($data['ticket'], $correlation);
        try {
            $user = DB::transaction(function () use ($result, $identity) {
                DB::table('ilia_access_tickets')->where('expires_at', '<', now())->delete();
                DB::table('ilia_access_tickets')->insert([
                    'id' => $result['ticket_id'],
                    'expires_at' => date('Y-m-d H:i:s', $result['ticket_expires_at']),
                ]);

                return $identity->sincronizar($result['user']);
            });
        } catch (QueryException $error) {
            if (DB::table('ilia_access_tickets')->where('id', $result['ticket_id'])->exists()) {
                return response()->json(['message' => 'Este acceso ya fue utilizado. Solicita uno nuevo desde ILIA.'], 409);
            }
            throw $error;
        }
        Auth::login($user);
        $request->session()->regenerate();
        $request->session()->put('ilia_identity', Crypt::encryptString($result['session_token']));
        Log::info('ilia.modulo.acceso', ['ilia_user_id' => $user->ilia_user_id, 'correlation_id' => $correlation]);

        return response()->json(['role' => $user->role, 'correlation_id' => $correlation])
            ->header('Cache-Control', 'no-store')->header('X-Correlation-ID', $correlation);
    }
}
