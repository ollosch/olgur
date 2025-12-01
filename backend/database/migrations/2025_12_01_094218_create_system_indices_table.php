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
        Schema::create('system_indices', function (Blueprint $table): void {
            $table->id();
            $table->foreignIdFor(System::class)
                ->constrained()
                ->cascadeOnDelete();

            $table->string('term');
            $table->string('definition', 1024);
            $table->string('references')->nullable();
            $table->string('links')->nullable();

            $table->timestamps();
        });
    }
};
