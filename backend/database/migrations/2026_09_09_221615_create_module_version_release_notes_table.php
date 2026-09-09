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
        Schema::create('module_version_release_notes', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('module_version_id')->constrained()->cascadeOnDelete();
            $table->string('entity_type');
            $table->ulid('entity_id');
            $table->text('note');
            $table->timestamps();

            $table->unique(['module_version_id', 'entity_type', 'entity_id'], 'release_notes_entity_unique');
        });
    }
};
