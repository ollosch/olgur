<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_datum_versions', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('game_datum_id')->nullable()->constrained('game_data')->nullOnDelete();
            $table->foreignUlid('module_version_id')->constrained('module_versions')->cascadeOnDelete();
            $table->string('type');
            $table->string('slug');
            $table->string('name');
            $table->json('content');
        });
    }
};
