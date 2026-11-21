<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NormalizacionEntregaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'practica.student_password' => 'student-test-fixture',
            'practica.instructor_password' => 'instructor-test-fixture',
        ]);
        $this->seed(DatabaseSeeder::class);
        $this->actingAs(User::where('role', 'student')->firstOrFail());
    }

    private function web(): array
    {
        return [
            'exercise_id' => 1, 'language' => 'python', 'code' => "print('Hola')",
            'history' => [['kind' => 'paste', 'code' => "print('Hola')", 'pasted_chars' => 13]],
            'ai_usage' => 'none',
        ];
    }

    private function externo(): array
    {
        return [
            'tarea' => ['id' => '1'], 'lenguaje' => ' Python ', 'codigoFuente' => "print('Hola')",
            'pasos' => [['accion' => 'pegado', 'contenido' => "print('Hola')", 'caracteresPegados' => '13']],
            'asistencia' => 'ninguna',
        ];
    }

    public function test_both_origins_return_the_same_contract_without_creating_deliveries(): void
    {
        $a = $this->postJson('/api/practica/normalizacion-entregas/web', $this->web())
            ->assertOk()->assertExactJson(['data' => $this->web()])->json();
        $b = $this->postJson('/api/practica/normalizacion-entregas/externo', $this->externo())
            ->assertOk()->assertExactJson(['data' => $this->web()])->json();

        $this->assertSame($a, $b);
        $this->assertDatabaseCount('submissions', 0);
    }

    public function test_invalid_and_ambiguous_numbers_are_rejected(): void
    {
        foreach (['uno', '1.5', '1e0', '-1', '1abc', ' 1 ', true, 1.5, str_repeat('9', 30)] as $invalid) {
            $body = $this->externo();
            $body['tarea']['id'] = $invalid;
            $this->postJson('/api/practica/normalizacion-entregas/externo', $body)
                ->assertUnprocessable()->assertJsonValidationErrors('tarea.id');
        }
        $this->postJson('/api/practica/normalizacion-entregas/web', [...$this->web(), 'exercise_id' => '1'])
            ->assertUnprocessable()->assertJsonValidationErrors('exercise_id');
        $this->assertDatabaseCount('submissions', 0);
    }

    public function test_required_fields_and_unknown_values_are_rejected(): void
    {
        $body = $this->externo();
        unset($body['codigoFuente']);
        $this->postJson('/api/practica/normalizacion-entregas/externo', $body)
            ->assertUnprocessable()->assertJsonValidationErrors('entrada.codigoFuente');
        $body = [...$this->externo(), 'asistencia' => 'desconocida'];
        $this->postJson('/api/practica/normalizacion-entregas/externo', $body)
            ->assertUnprocessable()->assertJsonValidationErrors('asistencia');
        $body = [...$this->web(), 'extra' => 'no definido'];
        $this->postJson('/api/practica/normalizacion-entregas/web', $body)->assertUnprocessable();
    }

    public function test_code_whitespace_and_empty_snapshots_are_preserved(): void
    {
        $code = "  print('Hola')\r\n";
        $web = [...$this->web(), 'code' => $code, 'history' => [
            ['kind' => 'typing', 'code' => '', 'pasted_chars' => 0],
            ['kind' => 'typing', 'code' => $code, 'pasted_chars' => 0],
        ]];
        $external = [...$this->externo(), 'codigoFuente' => $code, 'pasos' => [
            ['accion' => 'escritura', 'contenido' => '', 'caracteresPegados' => '0'],
            ['accion' => 'escritura', 'contenido' => $code, 'caracteresPegados' => '0'],
        ]];

        foreach ([['web', $web], ['externo', $external]] as [$origin, $body]) {
            $response = $this->postJson("/api/practica/normalizacion-entregas/$origin", $body)
                ->assertOk()->json('data');
            $this->assertSame($web, $response);
        }
    }

    public function test_history_consistency_and_exercise_language_are_validated(): void
    {
        $this->postJson('/api/practica/normalizacion-entregas/web', [...$this->web(), 'code' => 'otro'])
            ->assertUnprocessable()->assertJsonValidationErrors('history');
        $this->postJson('/api/practica/normalizacion-entregas/web', [...$this->web(), 'language' => 'php'])
            ->assertUnprocessable()->assertJsonValidationErrors('language');
        $body = $this->web();
        $body['history'][0]['pasted_chars'] = 0;
        $this->postJson('/api/practica/normalizacion-entregas/web', $body)
            ->assertUnprocessable()->assertJsonValidationErrors('history.0.pasted_chars');
        $body = $this->web();
        $body['history'] = (object) $body['history'];
        $this->postJson('/api/practica/normalizacion-entregas/web', $body)
            ->assertUnprocessable()->assertJsonValidationErrors('history');
        $this->assertDatabaseCount('submissions', 0);
    }

    public function test_both_routes_require_a_student_session(): void
    {
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/practica/normalizacion-entregas/web', $this->web())->assertUnauthorized();
        $this->actingAs(User::where('role', 'instructor')->firstOrFail());
        $this->postJson('/api/practica/normalizacion-entregas/externo', $this->externo())->assertForbidden();
    }
}
