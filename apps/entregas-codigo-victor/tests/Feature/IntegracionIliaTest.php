<?php

namespace Tests\Feature;

use App\Models\CodeReport;
use App\Models\User;
use App\Services\RabbitMqReportes;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class IntegracionIliaTest extends TestCase
{
    use RefreshDatabase;
    private string $uuid;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ilia.api_url' => 'http://localhost:8000/api/v1',
            'ilia.shared_secret' => 'integration-fixture-secret-with-32-bytes',
            'ilia.practice_enabled' => true, 'practica.student_password' => 'student-test-fixture',
            'practica.instructor_password' => 'instructor-test-fixture']);
        Http::preventStrayRequests();
        $this->uuid = (string) Str::uuid();
    }

    protected function tearDown(): void
    {
        foreach (CodeReport::all() as $report) {
            if ($report->file_path) {
                @unlink(storage_path('app/private/'.$report->file_path));
            }
        }
        parent::tearDown();
    }

    private function fake(array $responses): void
    {
        Http::swap(new \Illuminate\Http\Client\Factory);
        Http::preventStrayRequests();
        Http::fake($responses);
    }

    private function identity(string $role = 'student'): array
    {
        return ['id' => $this->uuid, 'full_name' => 'Persona Oficial',
            'email' => 'student@practica.test', 'role' => $role];
    }

    private function response(string $role = 'student'): array
    {
        return ['user' => $this->identity($role), 'ticket_id' => (string) Str::uuid(),
            'ticket_expires_at' => time() + 60, 'expires_at' => time() + 600,
            'session_token' => 'delegated-session-fixture'];
    }

    private function loginOfficial(string $role = 'student'): User
    {
        $result = $this->response($role);
        $this->fake(['*/exchange' => Http::response($result),
            '*/identity' => Http::response(['user' => $result['user']])]);
        $this->postJson('/acceso/ilia', ['ticket' => 'temporary-ticket-fixture'])->assertOk();
        return User::where('ilia_user_id', $this->uuid)->firstOrFail();
    }

    private function task(User $owner): int
    {
        return DB::table('exercises')->insertGetId(['instructor_id' => $owner->id,
            'title' => 'Tarea oficial', 'instructions' => 'Escribe una función.', 'language' => 'python']);
    }

    private function payload(int $id): array
    {
        return ['exercise_id' => $id, 'language' => 'python', 'code' => 'print(1)',
            'history' => [['kind' => 'typing', 'code' => 'print(1)', 'pasted_chars' => 0]],
            'ai_usage' => 'none'];
    }

    public function test_uuid_does_not_merge_with_practice_and_local_password_login_is_blocked(): void
    {
        $this->seed(DatabaseSeeder::class);
        $practice = User::where('email', 'student@practica.test')->firstOrFail();
        $official = $this->loginOfficial();
        $this->assertNotSame($practice->id, $official->id);
        $this->assertNull($practice->fresh()->ilia_user_id);
        $this->assertSame('student@practica.test', $official->ilia_email);
        $this->assertSame($this->uuid.'@identity.ilia.invalid', $official->email);
        $this->get('/modulo')->assertOk()->assertDontSee('Suma de una lista');
        $this->postJson('/acceso/login', ['email' => $official->email, 'password' => 'anything'])->assertUnprocessable();
    }

    public function test_ticket_is_single_use_and_correlation_is_preserved(): void
    {
        $result = $this->response();
        $this->fake(['*' => Http::response($result)]);
        $correlation = (string) Str::uuid();
        $this->withHeader('X-Correlation-ID', $correlation)
            ->postJson('/acceso/ilia', ['ticket' => 'temporary-ticket-fixture'])
            ->assertOk()->assertJsonPath('correlation_id', $correlation);
        $this->postJson('/acceso/ilia', ['ticket' => 'temporary-ticket-fixture'])->assertConflict();
        $this->assertDatabaseCount('ilia_access_tickets', 1);
        $this->assertDatabaseCount('users', 1);
        Http::assertSent(fn ($request) => $request->hasHeader('X-Request-Id', $correlation)
            && $request->hasHeader('X-Module-Key', config('ilia.shared_secret')));
    }

    public function test_invalid_and_unavailable_identity_create_no_user_and_leak_no_upstream_body(): void
    {
        $this->fake(['*' => Http::response(['detail' => 'invalid'], 401)]);
        $this->postJson('/acceso/ilia', ['ticket' => 'expired-ticket-fixture'])->assertUnauthorized();
        $this->fake(['*' => Http::response(['debug' => 'secret-upstream'], 500)]);
        $this->postJson('/acceso/ilia', ['ticket' => 'temporary-ticket-fixture'])
            ->assertStatus(503)->assertDontSee('secret-upstream');
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('ilia_access_tickets', 0);
    }

    public function test_malformed_identity_and_missing_ticket_are_rejected(): void
    {
        $this->postJson('/acceso/ilia', [])->assertUnprocessable();
        $result = $this->response();
        $result['user']['role'] = 'superuser';
        $this->fake(['*' => Http::response($result)]);
        $this->postJson('/acceso/ilia', ['ticket' => 'temporary-ticket-fixture'])->assertStatus(503);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_upstream_failure_blocks_pages_and_preserves_retryable_session(): void
    {
        $user = $this->loginOfficial('instructor');
        $this->fake(['*' => Http::failedConnection()]);
        $this->get('/modulo')->assertStatus(503)->assertSee('No pudimos continuar');
        $this->assertAuthenticatedAs($user);
        $this->fake(['*' => Http::response(['user' => $this->identity('instructor')])]);
        $this->get('/modulo')->assertOk();
    }

    public function test_revoked_identity_ends_session_and_role_downgrade_blocks_writes(): void
    {
        $user = $this->loginOfficial('instructor');
        $this->fake(['*' => Http::response(['user' => $this->identity('student')])]);
        $this->postJson('/tareas', ['title' => 'No permitida', 'instructions' => 'No', 'language' => 'python'])->assertForbidden();
        $this->assertSame('student', $user->fresh()->role);
        $this->fake(['*' => Http::response([], 401)]);
        $this->getJson('/api/practica/tareas/1/reportes')->assertUnauthorized();
        $this->assertGuest();
    }

    public function test_admin_has_instructor_capabilities_but_ownership_is_still_required(): void
    {
        $admin = $this->loginOfficial('admin');
        $this->assertSame('instructor', $admin->role);
        $owner = User::factory()->create(['role' => 'instructor']);
        $task = $this->task($owner);
        $this->get('/instructor/tareas/'.$task)->assertNotFound();
        $this->postJson('/api/practica/reportes-entregas', ['exercise_id' => $task])->assertNotFound();
        $this->postJson('/tareas', ['title' => 'Tarea nueva', 'instructions' => 'Escribe.', 'language' => 'python'])->assertRedirect();
        $this->assertDatabaseHas('exercises', ['instructor_id' => $admin->id, 'title' => 'Tarea nueva']);
    }

    public function test_student_submits_only_to_official_tasks_and_practice_remains_isolated(): void
    {
        $this->seed(DatabaseSeeder::class);
        $teacher = User::factory()->create(['role' => 'instructor']);
        $teacher->ilia_user_id = (string) Str::uuid();
        $teacher->save();
        $task = $this->task($teacher);
        $student = $this->loginOfficial();
        $this->get('/modulo')->assertSee('Tarea oficial')->assertDontSee('Suma de una lista');
        $this->get('/tareas/1')->assertNotFound();
        $this->postJson('/api/practica/entregas-codigo', $this->payload(1))->assertUnprocessable();
        $this->postJson('/api/practica/normalizacion-entregas/web', $this->payload(1))->assertNotFound();
        $this->postJson('/api/practica/entregas-codigo', $this->payload($task))->assertCreated();
        $this->assertDatabaseHas('submissions', ['student_id' => $student->id, 'exercise_id' => $task]);
        $this->postJson('/acceso/login', ['email' => 'student@practica.test', 'password' => 'student-test-fixture'])->assertOk();
        $this->get('/modulo')->assertSee('Suma de una lista')->assertDontSee('Tarea oficial');
        $this->get('/tareas/'.$task)->assertNotFound();
        $this->postJson('/api/practica/entregas-codigo', $this->payload($task))->assertUnprocessable();
    }

    public function test_official_instructor_generates_downloads_and_enqueues_submission_reports(): void
    {
        $teacher = $this->loginOfficial('instructor');
        $task = $this->task($teacher);
        $student = User::factory()->create(['role' => 'student', 'name' => 'Estudiante Oficial']);
        DB::table('submissions')->insert(['exercise_id' => $task, 'student_id' => $student->id,
            'code' => 'print(1)', 'history' => json_encode($this->payload($task)['history']),
            'ai_usage' => 'none', 'submitted_at' => now()]);
        $id = $this->postJson('/api/practica/reportes-entregas/sincrono', ['exercise_id' => $task])
            ->assertCreated()->assertJsonPath('data.row_count', 1)->json('data.id');
        $this->get('/reportes-entregas/'.$id.'/descargar')->assertOk();
        $report = CodeReport::findOrFail($id);
        $this->assertStringContainsString('Estudiante Oficial',
            file_get_contents(storage_path('app/private/'.$report->file_path)));
        $this->mock(RabbitMqReportes::class)->shouldReceive('publicar')->once();
        $this->postJson('/api/practica/reportes-entregas', ['exercise_id' => $task])->assertAccepted();
    }

    public function test_practice_form_and_local_login_need_no_official_api(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->get('/acceso/practica')->assertOk();
        $this->post('/acceso/practica', ['email' => 'instructor@practica.test', 'password' => 'instructor-test-fixture'])->assertRedirect('/modulo');
        $this->get('/modulo')->assertOk();
        Http::assertNothingSent();
        config(['ilia.practice_enabled' => false]);
        $this->get('/acceso/practica')->assertNotFound();
        $this->postJson('/acceso/login', ['email' => 'instructor@practica.test', 'password' => 'instructor-test-fixture'])->assertNotFound();
    }
}
