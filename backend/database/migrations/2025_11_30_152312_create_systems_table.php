<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('systems', function (Blueprint $table): void {
            $table->id();
            $table->foreignIdFor(User::class, 'owner_id')
                ->nullable()
                ->constrained('users', 'id')
                ->nullOnDelete();

            $table->string('name');
            $table->text('description');

            $table->timestamps();
        });
    }
};
