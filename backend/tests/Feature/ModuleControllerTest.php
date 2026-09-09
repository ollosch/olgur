<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Module;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertDatabaseMissing;
use function Pest\Laravel\deleteJson;
use function Pest\Laravel\getJson;
use function Pest\Laravel\patchJson;
use function Pest\Laravel\postJson;

// ── Unauthenticated ──────────────────────────────────────────────────────────

test('unauthenticated requests are rejected', function (string $method, string $path): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $url = str_replace(['{system}', '{module}'], [$system->id, $module->id], $path);

    $this->$method($url)->assertUnauthorized();
})->with([
    'index' => ['getJson',    '/api/systems/{system}/modules'],
    'store' => ['postJson',   '/api/systems/{system}/modules'],
    'show' => ['getJson',    '/api/systems/{system}/modules/{module}'],
    'update' => ['patchJson',  '/api/systems/{system}/modules/{module}'],
    'destroy' => ['deleteJson', '/api/systems/{system}/modules/{module}'],
]);

// ── authorization ... temporary ───────────────────────────────────────────────

test('regular user cannot create a module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    actingAs($user);
    Membership::factory()->for($user)->for($system)->create();

    postJson('/api/systems/'.$system->id.'/modules', ['slug' => 'core', 'name' => 'Core Rules', 'description' => 'The core rules.', 'config' => [], 'is_core' => false, 'sort_order' => 0])
        ->assertForbidden();
});

test('system admin can create a module', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    actingAs($admin);

    postJson('/api/systems/'.$system->id.'/modules', ['slug' => 'core', 'name' => 'Core Rules', 'description' => 'The core rules.', 'config' => [], 'is_core' => false, 'sort_order' => 0])
        ->assertCreated()
        ->assertJsonPath('data.slug', 'core');
});

test('regular user cannot update a module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id, [
        'slug' => $module->slug,
        'name' => 'Hacked',
        'description' => $module->description,
        'config' => $module->config,
        'is_core' => $module->is_core,
        'sort_order' => $module->sort_order,
    ])
        ->assertForbidden();
});

test('system admin can update a module', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    $module = Module::factory()->for($system)->create();
    actingAs($admin);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id, [
        'slug' => $module->slug,
        'name' => 'Admin Updated',
        'description' => $module->description,
        'config' => $module->config,
        'is_core' => $module->is_core,
        'sort_order' => $module->sort_order,
    ])
        ->assertOk()
        ->assertJsonPath('data.name', 'Admin Updated');
});

test('module editor can update a module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();
    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id, [
        'slug' => $module->slug,
        'name' => 'Editor Updated',
        'description' => $module->description,
        'config' => $module->config,
        'is_core' => $module->is_core,
        'sort_order' => $module->sort_order,
    ])
        ->assertSuccessful()
        ->assertJsonPath('data.name', 'Editor Updated');
});

test('regular user cannot delete a module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id)
        ->assertForbidden();
});

test('system admin can delete a module', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    $module = Module::factory()->for($system)->create();
    actingAs($admin);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id)
        ->assertNoContent();

    assertDatabaseMissing('modules', ['id' => $module->id]);
});

// ── index ────────────────────────────────────────────────────────────────────

test('index returns all modules for a system ordered by sort_order', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['name' => 'Expansion', 'slug' => 'expansion', 'sort_order' => 10]);
    Module::factory()->for($system)->create(['name' => 'Core', 'slug' => 'core', 'sort_order' => 0]);
    Membership::factory()->for($user)->for($system)->create();

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules')
        ->assertSuccessful();

    $names = collect($response->json('data'))->pluck('name')->all();
    expect($names)->toBe(['Core', 'Expansion']);
});

test('index does not return modules from other systems', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $other = System::factory()->create();
    Module::factory()->for($other)->create();
    Membership::factory()->for($user)->for($system)->create();

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules')
        ->assertSuccessful();

    expect($response->json('data'))->toBeEmpty();
});

test('index returns 404 for unknown system', function (): void {
    $user = User::factory()->create();
    actingAs($user);

    getJson('/api/systems/nonexistent-id/modules')
        ->assertNotFound();
});

// ── store ────────────────────────────────────────────────────────────────────

test('store creates a module within a system', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    actingAs($user);

    $payload = [
        'slug' => 'core',
        'name' => 'Core Rules',
        'description' => 'The base rulebook.',
        'config' => [],
        'is_core' => true,
        'sort_order' => 0,
    ];

    $response = postJson('/api/systems/'.$system->id.'/modules', $payload)
        ->assertCreated();

    $response->assertJsonPath('data.slug', 'core');
    $response->assertJsonPath('data.system_id', $system->id);
    $response->assertJsonPath('data.is_core', true);

    assertDatabaseHas('modules', ['slug' => 'core', 'system_id' => $system->id]);
});

test('store requires slug and name', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['slug', 'name']);
});

test('store rejects duplicate slug within the same system', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['slug' => 'taken']);
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules', ['slug' => 'taken', 'name' => 'Other'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['slug']);
});

test('store allows same slug in a different system', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    Module::factory()->create(['slug' => 'core']);
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules', ['slug' => 'core', 'name' => 'Core Rules', 'description' => 'The core rules.', 'config' => [], 'is_core' => false, 'sort_order' => 0])
        ->assertCreated();
});

test('store returns 404 for unknown system', function (): void {
    $user = User::factory()->superAdmin()->create();
    actingAs($user);

    postJson('/api/systems/nonexistent-id/modules', ['slug' => 'core', 'name' => 'Core'])
        ->assertNotFound();
});

// ── show ─────────────────────────────────────────────────────────────────────

test('show returns a single module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Membership::factory()->for($user)->for($system)->create();
    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id)->assertSuccessful();

    $response->assertJsonPath('data.id', $module->id);
    $response->assertJsonPath('data.system_id', $system->id);
});

test('index is forbidden for non-members', function (): void {
    $system = System::factory()->create();
    actingAs(User::factory()->create());

    getJson('/api/systems/'.$system->id.'/modules')->assertForbidden();
});

test('show returns 404 for module belonging to a different system', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $other = System::factory()->create();
    $module = Module::factory()->for($other)->create();
    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id)
        ->assertNotFound();
});

// ── update ───────────────────────────────────────────────────────────────────

test('update modifies a module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    actingAs($user);

    $response = patchJson('/api/systems/'.$system->id.'/modules/'.$module->id, [
        'slug' => $module->slug,
        'name' => 'Updated',
        'description' => $module->description,
        'config' => $module->config,
        'is_core' => $module->is_core,
        'sort_order' => $module->sort_order,
    ])
        ->assertSuccessful();

    $response->assertJsonPath('data.name', 'Updated');
    assertDatabaseHas('modules', ['id' => $module->id, 'name' => 'Updated']);
});

test('update rejects duplicate slug within same system', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['slug' => 'taken']);
    $module = Module::factory()->for($system)->create(['slug' => 'mine']);
    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id, ['slug' => 'taken'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['slug']);
});

test('update allows same slug on same module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create(['slug' => 'mine']);
    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id, [
        'slug' => 'mine',
        'name' => $module->name,
        'description' => $module->description,
        'config' => $module->config,
        'is_core' => $module->is_core,
        'sort_order' => $module->sort_order,
    ])
        ->assertSuccessful();
});

// ── destroy ───────────────────────────────────────────────────────────────────

test('destroy deletes a module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id)->assertNoContent();

    assertDatabaseMissing('modules', ['id' => $module->id]);
});

test('destroy returns 404 for unknown module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/nonexistent-id')
        ->assertNotFound();
});

test('destroy rejects deleting a core module', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    $core = Module::factory()->for($system)->core()->create();
    actingAs($admin);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$core->id)
        ->assertUnprocessable();

    assertDatabaseHas('modules', ['id' => $core->id]);
});

test('store rejects a second core module in the same system', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['is_core' => true]);
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules', [
        'slug' => 'second-core',
        'name' => 'Second Core',
        'description' => '',
        'config' => [],
        'is_core' => true,
        'sort_order' => 1,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['is_core']);
});

test('store allows a second core module in a different system', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $otherSystem = System::factory()->create();
    Module::factory()->for($otherSystem)->create(['is_core' => true]);
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules', [
        'slug' => 'core',
        'name' => 'Core Rules',
        'description' => '',
        'config' => [],
        'is_core' => true,
        'sort_order' => 0,
    ])->assertCreated();
});

test('store rejects a core module in a grouping_only system', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->groupingOnly()->create();
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules', [
        'slug' => 'core',
        'name' => 'Core Rules',
        'description' => '',
        'config' => [],
        'is_core' => true,
        'sort_order' => 0,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['is_core']);
});

// ── creator auto-subscription ─────────────────────────────────────────────────

test('store creates an editor subscription for the creator', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules', [
        'slug' => 'core',
        'name' => 'Core Rules',
        'description' => '',
        'config' => [],
        'is_core' => true,
        'sort_order' => 0,
    ])->assertCreated();

    $moduleId = $response->json('data.id');

    assertDatabaseHas('subscriptions', [
        'user_id' => $user->id,
        'module_id' => $moduleId,
        'editor' => true,
    ]);
});

test('store creates a membership for the creator if one does not exist', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Membership::factory()->for($user)->for($system)->create(['admin' => true]);
    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules', [
        'slug' => 'core',
        'name' => 'Core Rules',
        'description' => '',
        'config' => [],
        'is_core' => true,
        'sort_order' => 0,
    ])->assertCreated();

    $moduleId = $response->json('data.id');

    assertDatabaseHas('subscriptions', [
        'user_id' => $user->id,
        'module_id' => $moduleId,
        'editor' => true,
    ]);

    // Existing membership was not duplicated
    expect(Membership::query()->where('user_id', $user->id)->where('system_id', $system->id)->count())->toBe(1);
});
