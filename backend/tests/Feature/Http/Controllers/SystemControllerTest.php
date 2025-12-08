<?php

declare(strict_types=1);

use App\Actions\CreateSystem;
use App\Models\Permission;
use App\Models\Role;

use App\Models\User;
use function Pest\Laravel\actingAs;

beforeEach(function (): void {
    $this->user = User::factory()->create();

    $this->payload = [
        'name' => 'Test System',
        'description' => 'This is a test system.',
    ];

    $this->system = (new CreateSystem())->execute($this->user, $this->payload);

    $this->globalAdminRole = Role::where('name', 'admin')->where('system_id', null)->first();
    $this->systemAdminRole = Role::where('name', 'admin')->where('system_id', $this->system->id)->first();
});

function removePermission(Role $role, string $permissionName): Permission
{
    $permission = $role->permissions()->where('name', $permissionName)->first();

    if ($permission) {
        $role->permissions()->detach($permission->id);
    }

    return $permission;
}

/*----------------------------------------------------------------------
 * Create
 *---------------------------------------------------------------------*/
test('users can create systems', function (): void {
    $response = actingAs($this->user, 'sanctum')
      ->json('POST', '/api/systems', $this->payload);

    $response->assertStatus(201);
    $this->assertDatabaseHas('systems', $this->payload);
});

test('users cannot create systems w/o create.systems', function (): void {
    removePermission($this->globalAdminRole, 'create.systems');

    $payload = [
        'name' => 'Another Test System',
        'description' => 'This is another test system.',
    ];

    $response = actingAs($this->user, 'sanctum')
      ->json('POST', '/api/systems', $payload);

    $response->assertStatus(403);
    $this->assertDatabaseMissing('systems', $payload);
});

/*----------------------------------------------------------------------
 * Edit
 *---------------------------------------------------------------------*/
test('members can edit systems', function (): void {
    $this->user->roles()->attach($this->systemAdminRole->id,
        ['system_id' => $this->system->id],
    );

    $updatedPayload = [
        'name' => 'Updated Test System',
        'description' => 'This is an updated test system.',
    ];

    $response = actingAs($this->user, 'sanctum')
        ->json('PUT', '/api/systems/'.$this->system->id, $updatedPayload);

    $response->assertStatus(200);
    $this->assertDatabaseHas('systems', $updatedPayload);
});

test('members cannot edit systems w/o edit.system:system', function (): void {
    removePermission($this->systemAdminRole, 'edit.system');
    $this->user->roles()->detach();
    $this->user->roles()->attach($this->systemAdminRole->id,
        ['system_id' => $this->system->id],
    );

    $updatedPayload = [
        'name' => 'Updated Test System',
        'description' => 'This is an updated test system.',
    ];

    $response = actingAs($this->user, 'sanctum')
        ->json('PUT', '/api/systems/'.$this->system->id, $updatedPayload);

    $response->assertStatus(403);
    $this->assertDatabaseMissing('systems', $updatedPayload);
});

/*----------------------------------------------------------------------
 * Delete
 *---------------------------------------------------------------------*/
test('members can delete systems', function (): void {
    $this->user->roles()->attach($this->systemAdminRole->id,
        ['system_id' => $this->system->id],
    );

    $response = actingAs($this->user, 'sanctum')
      ->json('DELETE', '/api/systems/'.$this->system->id);

    $response->assertStatus(204);
    $this->assertDatabaseMissing('systems', $this->payload);
});

test('members cannot delete systems w/o delete.system:system', function (): void {
    removePermission($this->systemAdminRole, 'delete.system');
    $this->user->roles()->detach();
    $this->user->roles()->attach($this->systemAdminRole->id,
        ['system_id' => $this->system->id],
    );

    $response = actingAs($this->user, 'sanctum')
      ->json('DELETE', '/api/systems/'.$this->system->id);

    $response->assertStatus(403);
    $this->assertDatabaseHas('systems', $this->payload);
});

test('users cannot delete systems w/o delete.any.system:system', function (): void {
    removePermission($this->globalAdminRole, 'delete.any.system');
    $this->user->roles()->detach();
    $this->user->roles()->attach($this->globalAdminRole->id,
        ['system_id' => null],
    );

    $response = actingAs($this->user, 'sanctum')
      ->json('DELETE', '/api/systems/'.$this->system->id);

    $response->assertStatus(403);
    $this->assertDatabaseHas('systems', $this->payload);
});
