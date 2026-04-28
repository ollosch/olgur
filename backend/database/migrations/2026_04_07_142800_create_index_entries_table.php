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
        Schema::create('index_entries', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('module_id')->constrained()->cascadeOnDelete();
            $table->ulid('parent_id')->nullable()->index();

            // utf8mb4_bin = case-sensitive on MariaDB/MySQL; SQLite is already case-sensitive
            $col = $table->string('term');
            if (DB::getDriverName() !== 'sqlite') {
                $col->collation('utf8mb4_bin');
            }

            $table->text('definition')->default('');
            $table->text('notes')->default('');
            $table->json('relations')->default('{}');
            $table->timestamps();

            // Unique per (module, parent, term)
            // The same term may appear under different parents.
            // On MariaDB, NULLs are not considered equal in unique indexes,
            // so two distinct root entries with the same term would both be inserted.
            $table->unique(['module_id', 'parent_id', 'term']);
        });

        // Self-referential FK must be added after the table is created
        Schema::table('index_entries', function (Blueprint $table): void {
            $table->foreign('parent_id')->references('id')->on('index_entries')->cascadeOnDelete();
        });
    }
};
