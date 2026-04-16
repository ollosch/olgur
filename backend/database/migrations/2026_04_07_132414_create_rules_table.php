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
        Schema::create('rules', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('module_id')->constrained()->cascadeOnDelete();
            $table->ulid('parent_id')->nullable()->index();

            $table->string('number');
            $table->integer('sort_order')->default(0);
            $table->string('title');
            $table->text('content')->nullable();
            $table->timestamps();

            $table->unique(['number', 'module_id']);
        });

        // Self-referential FK must be added after the table is created
        Schema::table('rules', function (Blueprint $table): void {
            $table->foreign('parent_id')->references('id')->on('rules')->cascadeOnDelete();
        });
    }
};
