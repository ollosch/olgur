<?php

declare(strict_types=1);

use App\Models\Module;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rules', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('module_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('mpath');
            $table->string('title');
            $table->text('content');

            $table->timestamps();

            $table->unique(['module_id', 'mpath']);
        });
    }
};
