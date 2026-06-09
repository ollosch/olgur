<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('module_version_amendments', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('module_version_id')->constrained()->cascadeOnDelete();
            $table->string('entity_type');
            $table->ulid('entity_id');
            $table->string('change_type');
            $table->text('description');
            $table->json('content_after');
            $table->foreignUlid('amended_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('amended_at');

            $table->index(['module_version_id', 'amended_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('module_version_amendments');
    }
};
