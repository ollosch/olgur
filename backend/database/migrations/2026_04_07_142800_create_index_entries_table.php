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
            $table->string('expansion')->nullable();
            $table->text('definition')->nullable();
            $table->text('notes')->nullable();
            $table->json('rule_refs')->nullable();
            $table->json('see_also')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('index_entries');
    }
};
