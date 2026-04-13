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
        Schema::create('rule_versions', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('rule_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('module_version_id')->constrained()->cascadeOnDelete();
            $table->ulid('parent_id')->nullable()->index();

            $table->string('number');
            $table->string('title');
            $table->text('content')->nullable();
            $table->integer('sort_order')->default(0);
        });

        // Self-referential FK must be added after the table is created
        Schema::table('rule_versions', function (Blueprint $table): void {
            $table->foreign('parent_id')->references('id')->on('rule_versions')->cascadeOnDelete();
        });
    }
};
