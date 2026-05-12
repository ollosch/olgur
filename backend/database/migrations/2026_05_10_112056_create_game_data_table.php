<?php

declare(strict_types=1);
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_data', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('module_id')->constrained('modules')->cascadeOnDelete();
            $table->string('type');
            $table->string('slug');
            $table->string('name');
            $table->json('content');
            $table->timestamps();

            $table->unique(['module_id', 'type', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_data');
    }
};
