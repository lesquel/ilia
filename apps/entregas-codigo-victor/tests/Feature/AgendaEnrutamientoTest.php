<?php
namespace Tests\Feature;

use App\Models\AgendaEvent;
use App\Models\User;
use App\Services\Agenda\ConsumidorMensajesAgenda;
use App\Services\Agenda\FlujoAgenda;
use App\Services\Agenda\ProcesadorAgenda;
use App\Services\Agenda\RabbitAgenda;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Mockery;
use PhpAmqpLib\Message\AMQPMessage;
use Tests\TestCase;

class AgendaEnrutamientoTest extends TestCase
{
    use RefreshDatabase;
    private User $teacher;
    private User $student;
    private int $task;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create(['role' => 'instructor']);
        $this->student = User::factory()->create(['role' => 'student']);
        $this->task = DB::table('exercises')->insertGetId([
            'instructor_id' => $this->teacher->id, 'title' => 'Bucles de Python',
            'instructions' => 'Suma una lista.', 'language' => 'python',
            'course_title' => 'Programación', 'agenda_version' => 1,
            'due_at' => '2030-01-10 15:00:00',
        ]);
        $this->actingAs($this->teacher);
        Http::preventStrayRequests();
    }

    private function entrada(string $tipo, array $datos = []): array
    {
        return ['id' => (string) Str::uuid(), 'correlation_id' => (string) Str::uuid(),
            'tipo' => $tipo, 'prioridad' => 'normal', 'datos' => ['tarea_id' => $this->task, ...$datos]];
    }

    private function emitir(string $tipo, array $datos = []): AgendaEvent
    {
        $input = $this->entrada($tipo, $datos);
        $this->postJson('/api/practica/agenda/eventos', $input)->assertAccepted();
        return AgendaEvent::findOrFail($input['id']);
    }

    private function submission(): int
    {
        return DB::table('submissions')->insertGetId(['exercise_id' => $this->task,
            'student_id' => $this->student->id, 'code' => 'print(1)',
            'history' => '[{"kind":"typing","code":"print(1)","pasted_chars":0}]',
            'ai_usage' => 'none', 'submitted_at' => now()]);
    }

    public function test_three_valid_types_reach_distinct_consumers_and_persist_their_results(): void
    {
        $published = $this->emitir('tarea.publicada');
        $date = $this->emitir('tarea.fecha_modificada', ['fecha_nueva' => '2030-01-20T15:00:00Z']);
        $submitted = $this->emitir('entrega.registrada', ['entrega_id' => $this->submission()]);
        foreach ([[$published, 'publicaciones'], [$date, 'fechas'], [$submitted, 'entregas']] as [$event, $dest]) {
            $this->assertSame($dest, $event->destino);
            app(ProcesadorAgenda::class)->procesar($event->id, $dest);
            $this->assertSame('procesado', $event->fresh()->estado);
        }
        $this->assertDatabaseCount('agenda_items', 1);
        $this->assertDatabaseHas('agenda_items', ['exercise_id' => $this->task, 'due_at' => '2030-01-20 15:00:00']);
        $this->assertDatabaseHas('agenda_deliveries', ['student_id' => $this->student->id, 'exercise_id' => $this->task]);
    }

    public function test_unknown_type_is_recorded_and_is_not_published(): void
    {
        $this->postJson('/api/practica/agenda/eventos', $this->entrada('tarea.desconocida'))
            ->assertOk()->assertJsonPath('data.estado', 'no_enrutable')->assertJsonPath('data.destino', null);
        $bus = Mockery::mock(RabbitAgenda::class)->makePartial();
        $bus->shouldNotReceive('publicarEvento');
        $this->assertSame(0, $bus->publicarPendientes());
        $this->assertDatabaseCount('agenda_items', 0);
    }

    public function test_same_deadline_is_filtered_without_reaching_any_consumer(): void
    {
        $body = $this->entrada('tarea.fecha_modificada', ['fecha_nueva' => '2030-01-10T10:00:00-05:00']);
        $this->postJson('/api/practica/agenda/eventos', $body)->assertOk()
            ->assertJsonPath('data.estado', 'filtrado')->assertJsonPath('data.destino', null)
            ->assertJsonPath('data.motivo', 'La fecha de vencimiento no cambió.');
        $this->assertDatabaseHas('exercises', ['id' => $this->task, 'agenda_version' => 1]);
        $this->assertDatabaseCount('agenda_items', 0);
    }

    public function test_missing_fields_and_ambiguous_dates_are_validation_errors(): void
    {
        $body = $this->entrada('tarea.publicada'); unset($body['tipo']);
        $this->postJson('/api/practica/agenda/eventos', $body)->assertUnprocessable()->assertJsonValidationErrors('tipo');
        $this->postJson('/api/practica/agenda/eventos', $this->entrada('tarea.fecha_modificada'))
            ->assertUnprocessable()->assertJsonValidationErrors('datos.fecha_nueva');
        $this->postJson('/api/practica/agenda/eventos', $this->entrada('tarea.fecha_modificada', ['fecha_nueva' => '2030-01-11']))
            ->assertUnprocessable();
        $this->assertDatabaseCount('agenda_events', 0);
    }

    public function test_permissions_protect_events_dates_and_trace_records(): void
    {
        $event = $this->emitir('tarea.publicada');
        $this->actingAs($this->student)->postJson('/api/practica/agenda/eventos', $this->entrada('tarea.publicada'))->assertForbidden();
        $this->getJson('/api/practica/agenda/eventos/'.$event->id)->assertNotFound();
        $other = User::factory()->create(['role' => 'instructor']);
        $this->actingAs($other)->postJson('/tareas/'.$this->task.'/fecha', ['due_at' => '2030-02-01T09:00'])->assertNotFound();
        $this->getJson('/api/practica/agenda/eventos/'.$event->id)->assertNotFound();
    }

    public function test_duplicate_messages_and_out_of_order_dates_do_not_duplicate_or_rewind_agenda(): void
    {
        $old = $this->emitir('tarea.publicada');
        $new = $this->emitir('tarea.fecha_modificada', ['fecha_nueva' => '2030-02-01T10:00:00Z']);
        app(ProcesadorAgenda::class)->procesar($new->id, 'fechas');
        app(ProcesadorAgenda::class)->procesar($old->id, 'publicaciones');
        app(ProcesadorAgenda::class)->procesar($new->id, 'fechas');
        $this->assertDatabaseCount('agenda_items', 1);
        $this->assertDatabaseHas('agenda_items', ['version' => 2, 'due_at' => '2030-02-01 10:00:00']);
        $this->postJson('/api/practica/agenda/eventos', ['id' => $old->id, ...array_diff_key($this->entrada('tarea.publicada'), ['id' => 1])])->assertConflict();
    }

    public function test_database_outbox_keeps_task_and_event_when_transport_is_unavailable(): void
    {
        $this->post('/tareas', ['title' => 'Con outbox', 'instructions' => 'Resolver.',
            'language' => 'python', 'agenda_form' => 1, 'due_at' => '2030-01-20T10:30'])->assertRedirect();
        $event = AgendaEvent::latest('created_at')->firstOrFail();
        $bus = Mockery::mock(RabbitAgenda::class)->makePartial();
        $bus->shouldReceive('publicarEvento')->andThrow(new \RuntimeException('credential-not-for-output'));
        $this->assertSame(0, $bus->publicarPendientes());
        $this->assertSame('pendiente', $event->fresh()->estado);
        $this->assertStringNotContainsString('credential', $event->fresh()->motivo);
        $this->assertDatabaseHas('exercises', ['title' => 'Con outbox']);
    }

    public function test_wire_ack_happens_only_after_projection_commit_and_rejects_wrong_queue(): void
    {
        $event = $this->emitir('tarea.publicada');
        $body = json_encode(['id' => $event->id, 'correlation_id' => $event->correlation_id,
            'tipo' => $event->tipo, 'prioridad' => $event->prioridad, 'datos' => $event->datos]);
        $wrong = Mockery::mock(AMQPMessage::class)->makePartial();
        $wrong->shouldReceive('getBody')->andReturn($body);
        $wrong->shouldReceive('reject')->with(false)->once();
        $wrong->shouldNotReceive('ack');
        app(ConsumidorMensajesAgenda::class)->recibir($wrong, 'fechas');
        $this->assertDatabaseCount('agenda_items', 0);
        $message = Mockery::mock(AMQPMessage::class)->makePartial();
        $message->shouldReceive('getBody')->andReturn($body);
        $message->shouldReceive('ack')->once()->andReturnUsing(function () use ($event) {
            $this->assertSame('procesado', $event->fresh()->estado);
            $this->assertDatabaseHas('agenda_items', ['exercise_id' => $this->task]);
        });
        app(ConsumidorMensajesAgenda::class)->recibir($message, 'publicaciones');
    }

    public function test_timeline_filters_search_order_and_delivery_are_student_specific(): void
    {
        $this->travelTo(\Carbon\Carbon::parse('2030-01-10 16:00:00', 'UTC'));
        app(ProcesadorAgenda::class)->procesar($this->emitir('tarea.publicada')->id, 'publicaciones');
        $this->actingAs($this->student)->get('/modulo?estado=atrasados')->assertSee('Bucles de Python')->assertSee('Atrasada');
        $this->get('/modulo?estado=proximos')->assertDontSee('Bucles de Python');
        $this->get('/modulo?q=NoExiste')->assertDontSee('Bucles de Python');
        $submission = $this->submission();
        $this->actingAs($this->teacher);
        $event = $this->emitir('entrega.registrada', ['entrega_id' => $submission]);
        app(ProcesadorAgenda::class)->procesar($event->id, 'entregas');
        $this->actingAs($this->student)->get('/modulo?estado=entregadas&orden=curso')->assertSee('Bucles de Python')->assertSee('Entregada');
        $this->get('/modulo?estado=atrasados')->assertDontSee('Bucles de Python');
        $this->actingAs(User::factory()->create(['role' => 'student']))->get('/modulo?estado=atrasados')->assertSee('Bucles de Python');
        $this->travelBack();
    }

    public function test_official_student_only_sees_tasks_in_enrolled_courses_and_legacy_tasks(): void
    {
        $id = (string) Str::uuid(); $course = (string) Str::uuid(); $other = (string) Str::uuid();
        $this->student->ilia_user_id = $id; $this->student->save();
        $this->teacher->ilia_user_id = (string) Str::uuid(); $this->teacher->save();
        DB::table('exercises')->where('id', $this->task)->update(['ilia_course_id' => $course]);
        config(['ilia.api_url' => 'http://localhost:8000/api/v1', 'ilia.shared_secret' => str_repeat('x', 40)]);
        $user = ['id' => $id, 'email' => 'student@example.org', 'full_name' => 'Estudiante Oficial', 'role' => 'student'];
        Http::fake(['*/identity' => Http::response(['user' => $user]),
            '*/courses' => Http::response(['user' => $user, 'courses' => [['id' => $other, 'title' => 'Otro curso', 'slug' => 'otro']]])]);
        $this->actingAs($this->student)->withSession(['ilia_identity' => Crypt::encryptString('delegated')]);
        $this->get('/tareas/'.$this->task)->assertNotFound();
        $this->get('/modulo')->assertDontSee('Bucles de Python');
    }

    public function test_instructor_form_is_a_dialog_and_previous_dates_can_be_edited(): void
    {
        $this->get('/modulo')->assertOk()->assertSee('Agregar tarea')->assertSee('<dialog', false);
        $this->post('/tareas/'.$this->task.'/fecha', ['due_at' => '2030-01-10T10:00'])->assertRedirect();
        $event = AgendaEvent::firstOrFail();
        $this->assertSame('filtrado', $event->estado);
        $this->assertDatabaseHas('exercises', ['id' => $this->task, 'agenda_version' => 1]);
    }

    public function test_publisher_binds_three_queues_and_requires_persistent_confirmed_delivery(): void
    {
        $event = $this->emitir('tarea.publicada');
        foreach (['confirmed', 'returned', 'unconfirmed'] as $case) {
            $event->refresh()->update(['estado' => 'pendiente']);
            $ack = null; $returned = null;
            $channel = Mockery::mock(\PhpAmqpLib\Channel\AMQPChannel::class);
            $channel->shouldReceive('exchange_declare')->with(config('agenda.exchange'), 'direct', false, true, false)->once();
            foreach (['publicaciones'=>'tarea.publicada', 'fechas'=>'tarea.fecha_modificada', 'entregas'=>'entrega.registrada'] as $dest=>$tipo) {
                $channel->shouldReceive('queue_declare')->with(config('agenda.queues.'.$dest), false, true, false, false)->once();
                $channel->shouldReceive('queue_bind')->with(config('agenda.queues.'.$dest), config('agenda.exchange'), $tipo)->once();
            }
            $channel->shouldReceive('confirm_select')->once();
            $channel->shouldReceive('set_ack_handler')->andReturnUsing(function ($fn) use (&$ack) { $ack=$fn; });
            $channel->shouldReceive('set_nack_handler')->once();
            $channel->shouldReceive('set_return_listener')->andReturnUsing(function ($fn) use (&$returned) { $returned=$fn; });
            $channel->shouldReceive('basic_publish')->once()->withArgs(function ($message, $exchange, $key, $mandatory) use ($event) {
                $body=json_decode($message->getBody(), true);
                $this->assertSame($event->id, $body['id']);
                $this->assertSame($event->correlation_id, $body['correlation_id']);
                $this->assertSame('tarea.publicada', $key);
                $this->assertSame(2, $message->get('delivery_mode'));
                $this->assertTrue($mandatory);
                $this->assertArrayNotHasKey('code', $body['datos']);
                return true;
            });
            $channel->shouldReceive('wait_for_pending_acks_returns')->with(5.0)->once()
                ->andReturnUsing(function () use ($case, &$ack, &$returned) {
                    if ($case !== 'unconfirmed') $ack();
                    if ($case === 'returned') $returned();
                });
            if ($case === 'confirmed') $channel->shouldReceive('close')->once();
            $connection=Mockery::mock(\PhpAmqpLib\Connection\AMQPStreamConnection::class);
            $connection->shouldReceive('channel')->andReturn($channel);
            $connection->shouldReceive('close')->once();
            $this->mock(\App\Services\RabbitMqReportes::class)->shouldReceive('conectar')->andReturn($connection);
            try {
                app(RabbitAgenda::class)->publicarEvento($event);
                $this->assertSame('confirmed', $case);
                $this->assertSame('publicado', $event->fresh()->estado);
            } catch (\RuntimeException) {
                $this->assertNotSame('confirmed', $case);
                $this->assertSame('pendiente', $event->fresh()->estado);
            }
        }
    }

    public function test_consumer_requeues_processing_errors_and_records_failure_after_three_attempts(): void
    {
        $event=$this->emitir('entrega.registrada', ['entrega_id'=>$this->submission()]);
        $this->mock(\App\Services\Agenda\ConsumidorEntrega::class)->shouldReceive('procesar')
            ->times(3)->andThrow(new \RuntimeException('not-a-public-error'));
        $body=json_encode(['id'=>$event->id, 'tipo'=>$event->tipo, 'prioridad'=>$event->prioridad,
            'correlation_id'=>$event->correlation_id, 'datos'=>$event->datos]);
        for ($i=1;$i<=3;$i++) {
            $message=Mockery::mock(AMQPMessage::class)->makePartial();
            $message->shouldReceive('getBody')->andReturn($body);
            $message->shouldNotReceive('ack');
            if ($i<3) $message->shouldReceive('nack')->with(true)->once();
            else $message->shouldReceive('reject')->with(false)->once();
            app(ConsumidorMensajesAgenda::class)->recibir($message, 'entregas');
        }
        $this->assertSame('fallido', $event->fresh()->estado);
        $this->assertSame(3, $event->fresh()->intentos);
        $this->assertStringNotContainsString('not-a-public-error', $event->fresh()->motivo);
    }

    public function test_official_instructor_cannot_forge_the_selected_course(): void
    {
        $uuid=(string) Str::uuid(); $course=(string) Str::uuid();
        $this->teacher->ilia_user_id=$uuid; $this->teacher->save();
        config(['ilia.api_url'=>'http://localhost:8000/api/v1', 'ilia.shared_secret'=>str_repeat('x',40)]);
        $identity=['id'=>$uuid,'email'=>'teacher@example.org','full_name'=>'Docente Oficial','role'=>'instructor'];
        Http::fake(['*/identity'=>Http::response(['user'=>$identity]),
            '*/courses'=>Http::response(['user'=>$identity,'courses'=>[['id'=>$course,'title'=>'Curso real','slug'=>'curso-real']]])]);
        $this->withSession(['ilia_identity'=>Crypt::encryptString('delegated')]);
        $base=['title'=>'Nueva tarea','instructions'=>'Escribe.','language'=>'python','agenda_form'=>1,'due_at'=>'2030-01-20T10:00'];
        $this->postJson('/tareas', [...$base,'ilia_course_id'=>(string) Str::uuid()])->assertForbidden();
        $this->postJson('/tareas', [...$base,'ilia_course_id'=>$course])->assertRedirect();
        $this->assertDatabaseHas('exercises',['title'=>'Nueva tarea','ilia_course_id'=>$course,'course_title'=>'Curso real']);
        $this->assertDatabaseHas('agenda_events',['tipo'=>'tarea.publicada','estado'=>'pendiente']);
    }

    public function test_migration_preserves_old_completion_when_adding_a_deadline(): void
    {
        $first=$this->submission(); $last=$this->submission();
        $migration=require database_path('migrations/2026_11_26_000000_create_agenda_routing.php');
        $migration->down(); $migration->up();
        $this->assertDatabaseHas('agenda_deliveries',['submission_id'=>$last,'student_id'=>$this->student->id]);
        $this->assertDatabaseCount('agenda_deliveries',1);
        $event=$this->emitir('tarea.fecha_modificada',['fecha_nueva'=>'2030-01-20T15:00:00Z']);
        app(ProcesadorAgenda::class)->procesar($event->id,'fechas');
        $this->actingAs($this->student)->get('/modulo')->assertSee('Entregada');
    }
}
