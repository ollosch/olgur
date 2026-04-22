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
        Schema::create('modules', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('system_id')->constrained()->cascadeOnDelete();

            $table->string('slug');
            $table->string('name');
            $table->text('description')->default('');
            $table->json('config')->default('[]');
            $table->boolean('is_core')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['system_id', 'slug']);
        });
    }
};
