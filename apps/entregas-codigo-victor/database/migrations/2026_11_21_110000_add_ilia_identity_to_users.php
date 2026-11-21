<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('ilia_user_id')->nullable()->unique();
            $table->string('ilia_email')->nullable();
            $table->string('ilia_role', 20)->nullable();
        });
        Schema::create('ilia_access_tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->timestamp('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ilia_access_tickets');
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['ilia_user_id']);
            $table->dropColumn(['ilia_user_id', 'ilia_email', 'ilia_role']);
        });
    }
};
