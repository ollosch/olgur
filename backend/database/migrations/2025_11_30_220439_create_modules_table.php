<?php

declare(strict_types=1);

use App\Models\System;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modules', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('system_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('type');
            $table->string('name');
            $table->string('description');

            $table->timestamps();
        });
    }
};
