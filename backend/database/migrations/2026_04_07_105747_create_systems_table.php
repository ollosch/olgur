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
        Schema::create('systems', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->string('slug')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('config')->nullable();
            $table->timestamps();
        });
    }
};
