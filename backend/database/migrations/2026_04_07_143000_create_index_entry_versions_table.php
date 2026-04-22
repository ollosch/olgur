<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('index_entry_versions', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('index_entry_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUlid('module_version_id')->constrained()->cascadeOnDelete();
            $table->ulid('parent_id')->nullable()->index();

            $col = $table->string('term');
            if (DB::getDriverName() !== 'sqlite') {
                $col->collation('utf8mb4_bin');
            }

            $table->text('definition')->nullable();
            $table->text('notes')->nullable();
            $table->json('relations')->nullable();
        });

        // Self-referential FK must be added after the table is created
        Schema::table('index_entry_versions', function (Blueprint $table): void {
            $table->foreign('parent_id')->references('id')->on('index_entry_versions')->cascadeOnDelete();
        });
    }
};
