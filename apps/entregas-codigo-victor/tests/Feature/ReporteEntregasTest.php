<?php

namespace Tests\Feature;

use App\Models\CodeReport;
use App\Models\User;
use App\Services\GeneradorReporteEntregas;
use App\Services\ProcesadorReporteEntregas;
use App\Services\RabbitMqReportes;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Mockery;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use RuntimeException;
use Tests\TestCase;

class ReporteEntregasTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['practica.student_password' => 'student-test-fixture',
            'practica.instructor_password' => 'instructor-test-fixture']);
        $this->seed(DatabaseSeeder::class);
    }

    protected function tearDown(): void
    {
        if ($this->app) {
            foreach (CodeReport::pluck('id') as $id) {
                Storage::build(['driver' => 'local', 'root' => storage_path('app/private')])
                    ->delete('reportes-entregas/'.$id.'.csv');
            }
        }
        parent::tearDown();
    }

    private function instructor(): User
    {
        return User::where('email', 'instructor@practica.test')->firstOrFail();
    }

    private function entrega(): int
    {
        $estudiante = User::where('role', 'student')->firstOrFail();

        return DB::table('submissions')->insertGetId([
            'exercise_id' => 1, 'student_id' => $estudiante->id,
            'code' => 'print(1)', 'history' => json_encode([
                ['kind' => 'paste', 'code' => 'print(1)', 'pasted_chars' => 8],
            ]), 'ai_usage' => 'consultation', 'submitted_at' => now(),
        ]);
    }

    private function solicitar(): CodeReport
    {
        $this->mock(RabbitMqReportes::class, fn ($m) => $m->shouldReceive('publicar')->once());
        $id = $this->actingAs($this->instructor())->postJson('/api/practica/reportes-entregas', ['exercise_id' => 1])
            ->assertAccepted()->json('data.id');

        return CodeReport::findOrFail($id);
    }

    public function test_async_accepts_three_requests_and_preserves_correlation_without_generating_files(): void
    {
        $this->entrega();
        $correlation = (string) Str::uuid();
        $this->mock(RabbitMqReportes::class, function ($mock) use ($correlation) {
            $mock->shouldReceive('publicar')->times(3)->withArgs(function (CodeReport $r) use ($correlation) {
                $this->assertSame($correlation, $r->correlation_id);
                $this->assertSame('pending', $r->status);

                return true;
            });
        });
        $ids = [];
        for ($i = 0; $i < 3; $i++) {
            $response = $this->actingAs($this->instructor())->withHeader('X-Correlation-ID', $correlation)
                ->postJson('/api/practica/reportes-entregas', ['exercise_id' => 1])
                ->assertAccepted()->assertHeader('X-Correlation-ID', $correlation)
                ->assertJsonPath('data.status', 'pending')->assertJsonPath('data.download_url', null);
            $ids[] = $response->json('data.message_id');
        }
        $this->assertCount(3, array_unique($ids));
        $this->assertDatabaseCount('code_reports', 3);
        $this->assertSame(0, CodeReport::whereNotNull('file_path')->count());
    }

    public function test_invalid_requests_are_rejected_before_publish(): void
    {
        $this->mock(RabbitMqReportes::class, fn ($m) => $m->shouldNotReceive('publicar'));
        $this->actingAs($this->instructor());
        foreach ([[], ['exercise_id' => 'uno'], ['exercise_id' => '1']] as $data) {
            $this->postJson('/api/practica/reportes-entregas', $data)->assertUnprocessable()
                ->assertJsonValidationErrors('exercise_id');
        }
        $this->withHeader('X-Correlation-ID', 'invalido')->postJson('/api/practica/reportes-entregas', ['exercise_id' => 1])
            ->assertUnprocessable()->assertJsonValidationErrors('correlation_id');
        $this->assertDatabaseCount('code_reports', 0);
    }

    public function test_authentication_roles_and_task_ownership_are_enforced(): void
    {
        $this->postJson('/api/practica/reportes-entregas', ['exercise_id' => 1])->assertUnauthorized();
        $this->getJson('/api/practica/tareas/1/reportes')->assertUnauthorized();
        $this->actingAs(User::where('role', 'student')->firstOrFail())
            ->postJson('/api/practica/reportes-entregas', ['exercise_id' => 1])->assertForbidden();
        $this->actingAs(User::factory()->create(['role' => 'instructor']))
            ->postJson('/api/practica/reportes-entregas', ['exercise_id' => 1])->assertNotFound();
        $this->assertDatabaseCount('code_reports', 0);
    }

    public function test_sync_and_async_generate_equal_csv_and_do_not_include_later_deliveries(): void
    {
        $this->entrega();
        $async = $this->solicitar();
        $syncId = $this->actingAs($this->instructor())->postJson('/api/practica/reportes-entregas/sincrono', ['exercise_id' => 1])
            ->assertCreated()->assertJsonPath('data.status', 'completed')->json('data.id');
        $this->entrega(); // Esta entrega es posterior a ambas solicitudes.
        $procesador = app(ProcesadorReporteEntregas::class);
        $procesador->procesar($async->id);
        $async->refresh();
        $sync = CodeReport::findOrFail($syncId);
        $disk = Storage::build(['driver' => 'local', 'root' => storage_path('app/private')]);
        $this->assertSame($disk->get($sync->file_path), $disk->get($async->file_path));
        $this->assertSame(1, $async->row_count);
        $this->assertSame(1, $sync->row_count);
        $procesador->procesar($async->id);
        $this->assertSame(1, $async->fresh()->attempts);
        $this->get('/reportes-entregas/'.$async->id.'/descargar')->assertOk()->assertDownload();
    }

    public function test_empty_task_generates_headers_only(): void
    {
        $this->actingAs($this->instructor())->postJson('/api/practica/reportes-entregas/sincrono', ['exercise_id' => 1])
            ->assertCreated()->assertJsonPath('data.row_count', 0);
    }

    public function test_foreign_report_status_download_and_pending_download_are_protected(): void
    {
        $reporte = $this->solicitar();
        $this->get('/reportes-entregas/'.$reporte->id.'/descargar')->assertConflict();
        $this->getJson('/api/practica/tareas/1/reportes')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs(User::factory()->create(['role' => 'instructor']));
        $this->getJson('/api/practica/reportes-entregas/'.$reporte->id)->assertNotFound();
        $this->get('/reportes-entregas/'.$reporte->id.'/descargar')->assertNotFound();
        $this->getJson('/api/practica/tareas/1/reportes')->assertNotFound();
        $this->actingAs(User::where('role', 'student')->firstOrFail());
        $this->getJson('/api/practica/reportes-entregas/'.$reporte->id)->assertForbidden();
    }

    public function test_publication_failure_is_not_reported_as_accepted_and_does_not_leak_secrets(): void
    {
        $this->mock(RabbitMqReportes::class, fn ($m) => $m->shouldReceive('publicar')
            ->andThrow(new RuntimeException('SECRET-CONNECTION-EXAMPLE')));
        $this->actingAs($this->instructor())->postJson('/api/practica/reportes-entregas', ['exercise_id' => 1])
            ->assertStatus(503)->assertJsonPath('data.status', 'failed')
            ->assertDontSee('SECRET-CONNECTION-EXAMPLE');
    }

    public function test_processing_failure_is_recorded_with_generic_error_and_three_attempt_limit(): void
    {
        $r = $this->solicitar();
        $this->mock(GeneradorReporteEntregas::class, fn ($m) => $m->shouldReceive('generar')->times(3)
            ->andThrow(new RuntimeException('SECRET-INTERNAL-PATH')));
        $procesador = app(ProcesadorReporteEntregas::class);
        for ($i = 0; $i < 4; $i++) {
            try {
                $procesador->procesar($r->id);
                $this->fail('Debía fallar.');
            } catch (RuntimeException) {
                $this->assertSame('failed', $r->fresh()->status);
            }
        }
        $this->assertSame(3, $r->fresh()->attempts);
        $this->getJson('/api/practica/reportes-entregas/'.$r->id)->assertOk()->assertDontSee('SECRET-INTERNAL-PATH');
    }

    public function test_csv_escapes_formula_like_student_names(): void
    {
        User::where('role', 'student')->update(['name' => '=HYPERLINK("ejemplo")']);
        $this->entrega();
        $this->actingAs($this->instructor())->postJson('/api/practica/reportes-entregas/sincrono', ['exercise_id' => 1])->assertCreated();
        $r = CodeReport::firstOrFail();
        $csv = Storage::build(['driver' => 'local', 'root' => storage_path('app/private')])->get($r->file_path);
        $this->assertStringContainsString("'=HYPERLINK", $csv);
    }

    public function test_instructor_page_contains_report_controls(): void
    {
        $this->actingAs($this->instructor())->get('/instructor/tareas/1')->assertOk()
            ->assertSee('Generar reporte')->assertSee('Reportes de entregas')
            ->assertSee('practica/reportes.js');
    }

    public function test_consumer_confirms_only_after_result_has_been_saved(): void
    {
        $r = $this->solicitar();
        $body = json_encode(['message_id' => $r->message_id, 'correlation_id' => $r->correlation_id,
            'tipo' => 'reporte_entregas.solicitado', 'ocurrido_en' => now()->toISOString(),
            'payload' => ['reporte_id' => $r->id, 'tarea_id' => 1]]);
        $mensaje = Mockery::mock(AMQPMessage::class);
        $mensaje->shouldReceive('getBody')->andReturn($body);
        $mensaje->shouldReceive('ack')->once()->andReturnUsing(function () use ($r) {
            $actual = $r->fresh();
            $this->assertSame('completed', $actual->status);
            $this->assertFileExists(storage_path('app/private/'.$actual->file_path));
        });
        $this->consumidorSimulado($mensaje);
        $this->artisan('reportes:consumir --once')->assertSuccessful();
    }

    public function test_consumer_rejects_malformed_message_without_processing(): void
    {
        $mensaje = Mockery::mock(AMQPMessage::class);
        $mensaje->shouldReceive('getBody')->andReturn('{invalid');
        $mensaje->shouldReceive('reject')->with(false)->once();
        $mensaje->shouldNotReceive('ack');
        $this->consumidorSimulado($mensaje);
        $this->artisan('reportes:consumir --once')->assertSuccessful();
        $this->assertDatabaseCount('code_reports', 0);
    }

    public function test_consumer_requeues_failure_and_rejects_after_three_attempts(): void
    {
        $r = $this->solicitar();
        $this->mock(GeneradorReporteEntregas::class, fn ($m) => $m->shouldReceive('generar')->times(3)
            ->andThrow(new RuntimeException('Error de prueba')));
        for ($i = 1; $i <= 3; $i++) {
            $mensaje = Mockery::mock(AMQPMessage::class);
            $mensaje->shouldReceive('getBody')->andReturn(json_encode([
                'message_id' => $r->message_id, 'correlation_id' => $r->correlation_id,
                'tipo' => 'reporte_entregas.solicitado', 'ocurrido_en' => now()->toISOString(),
                'payload' => ['reporte_id' => $r->id, 'tarea_id' => 1],
            ]));
            $mensaje->shouldNotReceive('ack');
            if ($i < 3) {
                $mensaje->shouldReceive('nack')->with(true)->once();
            } else {
                $mensaje->shouldReceive('reject')->with(false)->once();
            }
            $this->consumidorSimulado($mensaje);
            $this->artisan('reportes:consumir --once')->assertSuccessful();
            $this->assertSame($i, $r->fresh()->attempts);
        }
    }

    public function test_publisher_uses_persistent_minimal_json_and_checks_broker_confirmation(): void
    {
        $r = $this->solicitar();
        foreach (['confirmed', 'returned', 'unconfirmed'] as $caso) {
            $ack = null;
            $returned = null;
            $channel = Mockery::mock(AMQPChannel::class);
            $channel->shouldReceive('queue_declare')->once();
            $channel->shouldReceive('confirm_select')->once();
            $channel->shouldReceive('set_ack_handler')->once()->andReturnUsing(function ($fn) use (&$ack) {
                $ack = $fn;
            });
            $channel->shouldReceive('set_nack_handler')->once();
            $channel->shouldReceive('set_return_listener')->once()->andReturnUsing(function ($fn) use (&$returned) {
                $returned = $fn;
            });
            $channel->shouldReceive('basic_publish')->once()->withArgs(function (AMQPMessage $message, $exchange, $queue, $mandatory) use ($r) {
                $body = json_decode($message->getBody(), true, flags: JSON_THROW_ON_ERROR);
                $this->assertSame($r->correlation_id, $body['correlation_id']);
                $this->assertSame(['reporte_id' => $r->id, 'tarea_id' => 1], $body['payload']);
                $this->assertSame(2, $message->get('delivery_mode'));
                $this->assertTrue($mandatory);

                return true;
            });
            $channel->shouldReceive('wait_for_pending_acks_returns')->with(5.0)->once()
                ->andReturnUsing(function () use (&$ack, &$returned, $caso) {
                    if ($caso !== 'unconfirmed') {
                        $ack(new AMQPMessage);
                    }
                    if ($caso === 'returned') {
                        $returned();
                    }
                });
            if ($caso === 'confirmed') {
                $channel->shouldReceive('close')->once();
            }
            $connection = Mockery::mock(AMQPStreamConnection::class);
            $connection->shouldReceive('channel')->once()->andReturn($channel);
            $connection->shouldReceive('isConnected')->andReturn(true);
            $connection->shouldReceive('close')->once();
            $publisher = Mockery::mock(RabbitMqReportes::class)->makePartial();
            $publisher->shouldReceive('conectar')->once()->andReturn($connection);
            try {
                $publisher->publicar($r);
                $this->assertSame('confirmed', $caso);
            } catch (RuntimeException) {
                $this->assertNotSame('confirmed', $caso);
            }
        }
    }

    private function consumidorSimulado(AMQPMessage $mensaje): void
    {
        $callback = null;
        $channel = Mockery::mock(AMQPChannel::class);
        $channel->shouldReceive('queue_declare')->once();
        $channel->shouldReceive('basic_qos')->with(0, 1, false)->once();
        $channel->shouldReceive('basic_consume')->once()->andReturnUsing(
            function (...$args) use (&$callback) {
                $callback = $args[6];
            });
        $channel->shouldReceive('is_consuming')->andReturn(true);
        $channel->shouldReceive('wait')->once()->andReturnUsing(function () use (&$callback, $mensaje) {
            $callback($mensaje);
        });
        $connection = Mockery::mock(AMQPStreamConnection::class);
        $connection->shouldReceive('channel')->once()->andReturn($channel);
        $connection->shouldReceive('isConnected')->andReturn(true);
        $connection->shouldReceive('close')->once();
        $this->mock(RabbitMqReportes::class, fn ($m) => $m->shouldReceive('conectar')->once()->andReturn($connection));
    }
}
