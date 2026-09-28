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
        Schema::create('memberships', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('system_id')->constrained()->cascadeOnDelete();

            $table->boolean('admin')->default(false);
            $table->boolean('proofreader')->default(false);
            $table->json('config')->default('[]');
            $table->timestamps();

            $table->unique(['user_id', 'system_id']);
        });
    }
};
