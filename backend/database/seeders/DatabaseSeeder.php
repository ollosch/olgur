<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\IndexEntry;
use App\Models\Membership;
use App\Models\Module;
use App\Models\Rule;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

final class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->superAdmin()->create([
            'name' => 'Admin',
            'email' => 'admin@olgur.de',
        ]);

        $ollo = User::factory()->create([
            'name' => 'Ollo',
            'email' => 'ollo@olgur.de',
        ]);

        $system = System::factory()->create([
            'name' => 'Olgur Testsystem',
            'slug' => 'olgur-testsystem',
        ]);

        Membership::factory()->for($system)->for($ollo)->admin()->create();

        $this->createModuleFor($ollo, $system, 'Modul 1', 'modul-1');
        $this->createModuleFor($ollo, $system, 'Modul 2', 'modul-2');
    }

    private function createModuleFor(User $user, System $system, string $name, string $slug): Module
    {
        $module = Module::factory()->create([
            'system_id' => $system->id,
            'name' => $name,
            'slug' => $slug,
        ]);

        Subscription::factory()->for($module)->for($user)->editor()->create();

        Rule::factory()->for($module)->count(10)->create()->each(fn (Rule $rule) => Rule::factory()->for($module)->count(3)->create([
            'parent_id' => $rule->id,
        ]
        ));

        IndexEntry::factory()->for($module)->count(10)->create()->each(fn (IndexEntry $entry) => IndexEntry::factory()->for($module)->count(3)->create([
            'parent_id' => $entry->id,
        ]
        ));

        return $module;
    }
}
