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
        Schema::create('module_versions', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('module_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('released_by')->nullable()->constrained('users')->nullOnDelete();

            $table->string('version_string');
            $table->text('notes')->default('');
            $table->integer('revision')->default(0);
            $table->timestamp('released_at')->nullable();
            $table->timestamps();

            $table->unique(['module_id', 'version_string']);
        });
    }
};
