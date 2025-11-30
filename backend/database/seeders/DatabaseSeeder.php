<?php

declare(strict_types=1);

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;

use App\Models\System;
use App\Models\User;
use Illuminate\Database\Seeder;

final class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $ollo = User::factory()->create([
            'name' => 'Ollo',
            'email' => 'ollo@olwu.de',
        ]);

        System::factory()->create([
            'owner_id' => $ollo->id,
            'name' => 'Ollo\'s First System',
            'description' => 'This is the first system.',
        ]);

        System::factory()->create();
    }
}
