<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('exercises', function (Blueprint $table) {
            $table->uuid('ilia_course_id')->nullable()->index();
            $table->string('course_title', 250)->nullable();
            $table->timestamp('due_at')->nullable();
            $table->unsignedInteger('agenda_version')->default(0);
        });
        Schema::create('agenda_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('correlation_id')->index();
            $table->foreignId('actor_id')->constrained('users');
            $table->foreignId('exercise_id')->constrained('exercises');
            $table->string('tipo', 80);
            $table->string('prioridad', 10);
            $table->string('destino', 30)->nullable();
            $table->string('estado', 25)->index();
            $table->string('motivo', 200)->nullable();
            $table->text('datos');
            $table->unsignedInteger('intentos')->default(0);
            $table->timestamp('published_at')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });
        Schema::create('agenda_items', function (Blueprint $table) {
            $table->foreignId('exercise_id')->primary()->constrained('exercises');
            $table->string('title', 150);
            $table->string('course_title', 250)->nullable();
            $table->timestamp('due_at')->nullable();
            $table->unsignedInteger('version');
            $table->timestamps();
        });
        Schema::create('agenda_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exercise_id')->constrained('exercises');
            $table->foreignId('student_id')->constrained('users');
            $table->foreignId('submission_id')->constrained('submissions');
            $table->timestamp('submitted_at');
            $table->unique(['exercise_id', 'student_id']);
        });
        // Preserve completion when an old task gains a deadline later.
        foreach (DB::table('submissions')->whereIn('id', DB::table('submissions')
            ->selectRaw('MAX(id)')->groupBy('exercise_id', 'student_id'))->orderBy('id')->cursor() as $row) {
            DB::table('agenda_deliveries')->insert([
                'exercise_id' => $row->exercise_id, 'student_id' => $row->student_id,
                'submission_id' => $row->id, 'submitted_at' => $row->submitted_at,
            ]);
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('agenda_deliveries');
        Schema::dropIfExists('agenda_items');
        Schema::dropIfExists('agenda_events');
        Schema::table('exercises', function (Blueprint $table) {
            $table->dropIndex(['ilia_course_id']);
            $table->dropColumn(['ilia_course_id', 'course_title', 'due_at', 'agenda_version']);
        });
    }
};
