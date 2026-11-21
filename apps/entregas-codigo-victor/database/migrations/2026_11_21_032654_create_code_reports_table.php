<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('code_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('message_id')->unique();
            $table->uuid('correlation_id')->index();
            $table->foreignId('exercise_id')->constrained('exercises');
            $table->foreignId('requested_by')->constrained('users');
            $table->string('mode', 10)->default('async');
            $table->string('status', 20)->default('pending')->index();
            $table->unsignedBigInteger('last_submission_id')->default(0);
            $table->unsignedInteger('attempts')->default(0);
            $table->unsignedInteger('row_count')->nullable();
            $table->string('file_path')->nullable();
            $table->string('error_message', 255)->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('code_reports');
    }
};
