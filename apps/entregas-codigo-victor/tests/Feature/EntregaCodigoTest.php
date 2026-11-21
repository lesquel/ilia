<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EntregaCodigoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'practica.student_password' => 'student-test-fixture',
            'practica.instructor_password' => 'instructor-test-fixture',
        ]);
    }

    private function payload(): array
    {
        $code = "def total(values):\n    return sum(values)\n";

        return [
            'exercise_id' => 1,
            'language' => 'python',
            'code' => $code,
            'history' => [
                ['kind' => 'typing', 'code' => 'def total(values):', 'pasted_chars' => 0],
                ['kind' => 'paste', 'code' => $code, 'pasted_chars' => 24],
            ],
            'ai_usage' => 'none',
        ];
    }

    public function test_student_can_submit_and_instructor_can_review_the_saved_history(): void
    {
        $this->seed(DatabaseSeeder::class);
        $student = User::where('role', 'student')->firstOrFail();
        $instructor = User::where('role', 'instructor')->firstOrFail();

        $data = $this->payload();
        $id = $this->actingAs($student)
            ->postJson('/api/practica/entregas-codigo', $data)
            ->assertCreated()
            ->assertJsonPath('data.step_count', 2)
            ->assertJsonPath('data.paste_count', 1)
            ->assertJsonPath('data.largest_paste_chars', 24)
            ->json('data.submission_id');

        $this->assertDatabaseHas('submissions', ['id' => $id, 'code' => $data['code']]);
        $this->get("/entregas/{$id}")->assertForbidden();
        $this->actingAs($instructor)->get("/entregas/{$id}")->assertOk();
    }

    public function test_invalid_contract_does_not_create_a_submission(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->actingAs(User::where('role', 'student')->firstOrFail());
        $data = $this->payload();

        $missing = $data;
        unset($missing['code']);
        $this->postJson('/api/practica/entregas-codigo', $missing)
            ->assertUnprocessable()->assertJsonValidationErrors('code');

        $this->postJson('/api/practica/entregas-codigo', [...$data, 'history' => 'texto'])
            ->assertUnprocessable()->assertJsonValidationErrors('history');

        $this->postJson('/api/practica/entregas-codigo', [...$data, 'history' => (object) $data['history']])
            ->assertUnprocessable()->assertJsonValidationErrors('history');

        $this->postJson('/api/practica/entregas-codigo', [...$data, 'code' => 'otro código'])
            ->assertUnprocessable()->assertJsonValidationErrors('history');

        $this->assertDatabaseCount('submissions', 0);
    }

    public function test_student_opens_an_exercise_from_the_personal_dashboard(): void
    {
        $this->seed(DatabaseSeeder::class);
        $student = User::where('role', 'student')->firstOrFail();
        $instructor = User::where('role', 'instructor')->firstOrFail();

        $this->actingAs($student)->get('/modulo')
            ->assertOk()
            ->assertSee('Mi espacio')
            ->assertSee('Suma de una lista')
            ->assertSee('Pendiente')
            ->assertSee(route('module.exercise', 1))
            ->assertDontSee('name="code"', false);

        $this->get('/tareas/1')
            ->assertOk()
            ->assertSee('Suma de una lista')
            ->assertSee('name="code"', false);
        $this->get('/tareas/999')->assertNotFound();

        $this->postJson('/api/practica/entregas-codigo', $this->payload())->assertCreated();
        $this->get('/modulo')->assertOk()->assertSee('Entregada')->assertDontSee('Pendiente');
        $this->actingAs(User::factory()->create(['role' => 'student']))->get('/modulo')
            ->assertOk()->assertSee('Pendiente')->assertDontSee('Entregada');
        $this->actingAs($instructor)->get('/tareas/1')->assertForbidden();
    }

    public function test_instructor_reviews_deliveries_by_owned_exercise(): void
    {
        $this->seed(DatabaseSeeder::class);
        $instructor = User::where('role', 'instructor')->firstOrFail();
        $otherInstructor = User::factory()->create(['role' => 'instructor']);
        $student = User::where('role', 'student')->firstOrFail();
        $createTask = fn ($title) => [
            'title' => $title, 'instructions' => 'Escribe una función.', 'language' => 'python',
        ];

        $this->actingAs($instructor)->from('/modulo')->post('/tareas', $createTask('Otra tarea'))->assertRedirect('/modulo');
        $this->actingAs($otherInstructor)->from('/modulo')->post('/tareas', $createTask('Tarea ajena'))->assertRedirect('/modulo');

        $first = $this->actingAs($student)->postJson('/api/practica/entregas-codigo', $this->payload())
            ->assertCreated()->json('data.submission_id');
        $second = $this->postJson('/api/practica/entregas-codigo', [...$this->payload(), 'exercise_id' => 2])
            ->assertCreated()->json('data.submission_id');
        $this->get('/instructor/tareas/1')->assertForbidden();

        $this->actingAs($instructor)->get('/modulo')
            ->assertOk()->assertSee('Mi espacio')->assertSee('Mis tareas')
            ->assertSee('Otra tarea')->assertSee('1 entrega')->assertDontSee('Tarea ajena');
        $this->get('/instructor/tareas/1')
            ->assertOk()->assertSee('Suma de una lista')->assertSee($student->name)
            ->assertSee(route('module.review', $first))->assertDontSee(route('module.review', $second));
        $this->get("/entregas/{$first}")->assertOk()->assertSee(route('module.instructor.exercise', 1));
        $this->get('/instructor/tareas/3')->assertNotFound();
        $this->actingAs($otherInstructor)->get("/entregas/{$first}")->assertNotFound();
    }

    public function test_api_requires_student_access(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->postJson('/api/practica/entregas-codigo', $this->payload())->assertUnauthorized();
        $instructor = User::where('role', 'instructor')->firstOrFail();
        $this->actingAs($instructor)->postJson('/api/practica/entregas-codigo', $this->payload())->assertForbidden();
    }
}
