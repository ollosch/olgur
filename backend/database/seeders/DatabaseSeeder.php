<?php

declare(strict_types=1);

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;

use App\Enums\PermissionList;
use App\Models\Permission;
use App\Models\Role;
use App\Models\System;
use App\Models\User;
use Illuminate\Database\Seeder;

final class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $ollo = User::factory()->create([
            'name' => 'Ollo',
            'email' => 'ollo@olgur.de',
        ]);

        $system = System::factory()->create([
            'owner_id' => $ollo->id,
            'name' => 'Ollo\'s First System',
            'description' => 'This is the first system.',
        ]);

        $role = Role::factory()->create([
            'system_id' => $system->id,
            'name' => 'admin',
        ]);
        $role->permissions()->attach(Permission::system()->pluck('id')->toArray());

        Role::factory()->create([
            'system_id' => $system->id,
            'name' => 'module-admin',
        ]);
        $role->permissions()->attach(Permission::module()->pluck('id')->toArray());

        $ollo->assignRole('admin', $system);
        $ollo->assignRole('module-admin', $system);
    }
}
