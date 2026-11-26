<?php

namespace App\Services;

use App\Exceptions\IdentidadIliaException;
use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class IdentidadIlia
{
    public function intercambiar(string $ticket, string $correlation): array
    {
        $data = $this->peticion('exchange', ['ticket' => $ticket], null, $correlation);
        if (Validator::make($data, [
            'ticket_id' => ['required', 'uuid'],
            'ticket_expires_at' => ['required', 'integer', 'min:'.time()],
            'session_token' => ['required', 'string', 'max:4096'],
            'expires_at' => ['required', 'integer', 'min:'.time()],
        ])->fails()) {
            throw new IdentidadIliaException(503);
        }

        return $data;
    }

    public function verificar(string $token, string $correlation): array
    {
        return $this->peticion('identity', [], $token, $correlation);
    }

    public function cursos(string $token, string $correlation): array
    {
        $data = $this->peticion('courses', [], $token, $correlation);
        if (Validator::make($data, [
            'courses' => ['present', 'array', 'list'],
            'courses.*.id' => ['required', 'uuid'],
            'courses.*.title' => ['required', 'string', 'max:250'],
            'courses.*.slug' => ['required', 'string', 'max:250'],
        ])->fails()) {
            throw new IdentidadIliaException(503);
        }
        return $data['courses'];
    }

    public function sincronizar(array $identity): User
    {
        $id = strtolower($identity['id']);
        $user = User::where('ilia_user_id', $id)->first();
        if (! $user) {
            $user = new User;
            // A distinct namespace avoids merging by email with demonstration accounts.
            $user->email = $id.'@identity.ilia.invalid';
            $user->password = Str::random(64);
            $user->ilia_user_id = $id;
        }
        $user->name = $identity['full_name'];
        $user->ilia_email = $identity['email'];
        $user->ilia_role = $identity['role'];
        // Admin has instructor capabilities here; ownership still applies to every task/report.
        $user->role = $identity['role'] === 'student' ? 'student' : 'instructor';
        $user->save();

        return $user;
    }

    private function peticion(string $action, array $body, ?string $token, string $correlation): array
    {
        $secret = (string) config('ilia.shared_secret');
        $url = rtrim((string) config('ilia.api_url'), '/');
        $parts = parse_url($url);
        if (strlen($secret) < 32 || ! $parts || ! isset($parts['host']) ||
            (($parts['scheme'] ?? '') !== 'https' &&
             !(($parts['scheme'] ?? '') === 'http' && in_array($parts['host'], ['localhost', '127.0.0.1'], true)))) {
            throw new IdentidadIliaException(503);
        }
        try {
            $http = Http::acceptJson()->asJson()->connectTimeout(2)->timeout(5)->withoutRedirecting()
                ->withHeaders(['X-Module-Key' => $secret, 'X-Request-Id' => $correlation]);
            $response = $token === null
                ? $http->post($url.'/auth/code-module/'.$action, $body)
                : $http->withToken($token)->get($url.'/auth/code-module/'.$action);
        } catch (ConnectionException) {
            throw new IdentidadIliaException(503);
        }
        if (in_array($response->status(), [401, 403], true)) {
            throw new IdentidadIliaException(401);
        }
        $data = $response->json();
        if (! $response->successful() || ! is_array($data) || Validator::make($data, [
            'user' => ['required', 'array'],
            'user.id' => ['required', 'uuid'],
            'user.full_name' => ['required', 'string', 'max:120'],
            'user.email' => ['required', 'email', 'max:254'],
            'user.role' => ['required', 'in:student,instructor,admin'],
        ])->fails()) {
            throw new IdentidadIliaException(503);
        }

        return $data;
    }
}
