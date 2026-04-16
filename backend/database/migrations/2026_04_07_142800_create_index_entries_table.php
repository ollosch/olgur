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
        Schema::create('index_entries', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('module_id')->constrained()->cascadeOnDelete();
            $table->ulid('parent_id')->nullable()->index();

            $table->string('term');
            $table->text('definition')->nullable();
            $table->text('notes')->nullable();
            $table->json('relations')->nullable();
            $table->timestamps();

            $table->unique(['module_id', 'term']);
        });

        // Self-referential FK must be added after the table is created
        Schema::table('index_entries', function (Blueprint $table): void {
            $table->foreign('parent_id')->references('id')->on('index_entries')->cascadeOnDelete();
        });
    }
};
