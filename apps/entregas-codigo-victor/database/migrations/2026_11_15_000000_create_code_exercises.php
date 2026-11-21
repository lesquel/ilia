<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('student');
        });

        Schema::create('exercises', function (Blueprint $table) {
            $table->id();
            $table->foreignId('instructor_id')->constrained('users');
            $table->string('title');
            $table->text('instructions');
            $table->string('language');
        });

        Schema::create('submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exercise_id')->constrained();
            $table->foreignId('student_id')->constrained('users');
            $table->text('code');
            $table->json('history');
            $table->string('ai_usage');
            $table->timestamp('submitted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('submissions');
        Schema::dropIfExists('exercises');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('role'));
    }
};
