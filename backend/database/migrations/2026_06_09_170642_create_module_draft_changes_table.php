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
        Schema::create('module_draft_changes', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('module_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('module_version_id')->nullable()->constrained()->nullOnDelete();
            $table->string('entity_type');
            $table->ulid('entity_id');
            $table->string('change_type');
            $table->string('classification')->default('semantic');
            $table->json('content_before')->nullable();
            $table->json('content_after')->nullable();
            $table->foreignUlid('changed_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('changed_at');

            $table->index(['module_id', 'changed_at']);
        });
    }
};
