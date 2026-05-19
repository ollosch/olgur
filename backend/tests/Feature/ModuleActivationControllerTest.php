<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Module;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\deleteJson;
use function Pest\Laravel\postJson;

// ── Unauthenticated ──────────────────────────────────────────────────────────

test('unauthenticated requests are rejected', function (string $method, string $path): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $url = str_replace(['{system}', '{module}'], [$system->id, $module->id], $path);

    $this->$method($url)->assertUnauthorized();
})->with([
    'activate' => ['postJson',   '/api/systems/{system}/modules/{module}/activate'],
    'deactivate' => ['deleteJson', '/api/systems/{system}/modules/{module}/activate'],
]);

// ── POST /activate ───────────────────────────────────────────────────────────

test('user can activate an expansion module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Membership::factory()->for($user)->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();
    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/activate')
        ->assertSuccessful();

    expect($response->json('data.active_module_ids'))->toContain($module->id);
});

test('user cannot activate a core module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    Membership::factory()->for($user)->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/activate')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['module_id']);
});

test('activating an already active module is idempotent', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Membership::factory()->for($user)->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/activate')->assertSuccessful();

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/activate')
        ->assertSuccessful();

    $activeIds = $response->json('data.active_module_ids');
    expect(array_count_values($activeIds)[$module->id])->toBe(1);
});

test('user cannot activate a module they are not subscribed to', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Membership::factory()->for($user)->for($system)->create();
    // No subscription created
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/activate')
        ->assertForbidden();
});

test('user cannot activate a module in a system they are not a member of', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    // No membership created
    Subscription::factory()->for($user)->for($module)->create();
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/activate')
        ->assertForbidden();
});

// ── DELETE /activate ─────────────────────────────────────────────────────────

test('user can deactivate an expansion module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Membership::factory()->for($user)->for($system)->create([
        'config' => ['active_module_ids' => [$module->id]],
    ]);
    Subscription::factory()->for($user)->for($module)->create();
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/activate')
        ->assertNoContent();

    $membership = Membership::query()
        ->where('user_id', $user->id)
        ->where('system_id', $system->id)
        ->first();

    expect($membership?->config?->activeModuleIds ?? [])->not->toContain($module->id);
});

test('user cannot deactivate a core module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    Membership::factory()->for($user)->for($system)->create();
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/activate')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['module_id']);
});

test('member can deactivate a module even without a subscription', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Membership::factory()->for($user)->for($system)->create([
        'config' => ['active_module_ids' => [$module->id]],
    ]);
    // No subscription
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/activate')
        ->assertNoContent();
});

test('non-member cannot deactivate a module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    // No membership
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/activate')
        ->assertForbidden();
});

// ── always appends to active_module_ids ──────────────────────────────────────

test('activating always appends to active_module_ids without clearing others', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    Membership::factory()->for($user)->for($system)->create();
    Subscription::factory()->for($user)->for($moduleA)->create();
    Subscription::factory()->for($user)->for($moduleB)->create();
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$moduleA->id.'/activate')->assertSuccessful();

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$moduleB->id.'/activate')
        ->assertSuccessful();

    $activeIds = $response->json('data.active_module_ids');
    expect($activeIds)
        ->toContain($moduleA->id)
        ->toContain($moduleB->id);
});

// ── core_plus_one enforcement ─────────────────────────────────────────────────

test('activating in core_plus_one system deactivates other active expansions', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create(['config' => ['system_structure' => 'core_plus_one']]);
    $moduleA = Module::factory()->for($system)->create(['is_core' => false]);
    $moduleB = Module::factory()->for($system)->create(['is_core' => false]);
    Membership::factory()->for($user)->for($system)->create([
        'config' => ['active_module_ids' => [$moduleA->id]],
    ]);
    Subscription::factory()->for($user)->for($moduleA)->create();
    Subscription::factory()->for($user)->for($moduleB)->create();
    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$moduleB->id.'/activate')
        ->assertSuccessful();

    $activeIds = $response->json('data.active_module_ids');
    expect($activeIds)
        ->toContain($moduleB->id)
        ->not->toContain($moduleA->id);
});

test('activating in core_plus_many preserves all active expansions', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create(['config' => ['system_structure' => 'core_plus_many']]);
    $moduleA = Module::factory()->for($system)->create(['is_core' => false]);
    $moduleB = Module::factory()->for($system)->create(['is_core' => false]);
    Membership::factory()->for($user)->for($system)->create([
        'config' => ['active_module_ids' => [$moduleA->id]],
    ]);
    Subscription::factory()->for($user)->for($moduleA)->create();
    Subscription::factory()->for($user)->for($moduleB)->create();
    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$moduleB->id.'/activate')
        ->assertSuccessful();

    $activeIds = $response->json('data.active_module_ids');
    expect($activeIds)
        ->toContain($moduleA->id)
        ->toContain($moduleB->id);
});

// ── config key preservation ───────────────────────────────────────────────────

test('activating preserves other config keys like bookmarks', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $bookmark = ['type' => 'rule', 'id' => 'abcdefghijklmnopqrstuvwxyz'];
    Membership::factory()->for($user)->for($system)->create([
        'config' => ['active_module_ids' => [], 'bookmarks' => [$bookmark]],
    ]);
    Subscription::factory()->for($user)->for($module)->create();
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/activate')
        ->assertSuccessful();

    $membership = Membership::query()
        ->where('user_id', $user->id)
        ->where('system_id', $system->id)
        ->first();

    expect($membership?->config?->bookmarks ?? [])->toBe([$bookmark]);
});

test('deactivating preserves other config keys like bookmarks', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $bookmark = ['type' => 'rule', 'id' => 'abcdefghijklmnopqrstuvwxyz'];
    Membership::factory()->for($user)->for($system)->create([
        'config' => ['active_module_ids' => [$module->id], 'bookmarks' => [$bookmark]],
    ]);
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/activate')
        ->assertNoContent();

    $membership = Membership::query()
        ->where('user_id', $user->id)
        ->where('system_id', $system->id)
        ->first();

    expect($membership?->config?->bookmarks ?? [])->toBe([$bookmark]);
});
