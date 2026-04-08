<?php

declare(strict_types=1);

use App\Models\Membership;
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
    $membership = Membership::factory()->for($system)->create();
    $url = str_replace(['{system}', '{membership}'], [$system->id, $membership->id], $path);

    $this->$method($url)->assertUnauthorized();
})->with([
    'index' => ['getJson',    '/api/systems/{system}/memberships'],
    'store' => ['postJson',   '/api/systems/{system}/memberships'],
    'update' => ['patchJson',  '/api/systems/{system}/memberships/{membership}'],
    'destroy' => ['deleteJson', '/api/systems/{system}/memberships/{membership}'],
]);

// ── index ────────────────────────────────────────────────────────────────────

test('index returns all memberships for a system', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Membership::factory()->for($system)->count(3)->create();
    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/memberships')
        ->assertSuccessful();

    expect($response->json('data'))->toHaveCount(3);
});

test('index does not return memberships from other systems', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $other = System::factory()->create();
    Membership::factory()->for($other)->count(2)->create();
    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/memberships')
        ->assertSuccessful();

    expect($response->json('data'))->toBeEmpty();
});

test('index returns 404 for unknown system', function (): void {
    actingAs(User::factory()->create());

    getJson('/api/systems/nonexistent/memberships')->assertNotFound();
});

// ── store ────────────────────────────────────────────────────────────────────

test('store adds a user to a system', function (): void {
    $admin = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $user = User::factory()->create();
    actingAs($admin);

    $response = postJson('/api/systems/'.$system->id.'/memberships', [
        'user_id' => $user->id,
    ])->assertCreated();

    $response->assertJsonPath('data.user_id', $user->id);
    $response->assertJsonPath('data.system_id', $system->id);
    $response->assertJsonPath('data.admin', false);

    assertDatabaseHas('memberships', ['user_id' => $user->id, 'system_id' => $system->id]);
});

test('store can create an admin membership', function (): void {
    $admin = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $user = User::factory()->create();
    actingAs($admin);

    $response = postJson('/api/systems/'.$system->id.'/memberships', [
        'user_id' => $user->id,
        'admin' => true,
    ])->assertCreated();

    $response->assertJsonPath('data.admin', true);
});

test('store requires user_id', function (): void {
    $admin = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    actingAs($admin);

    postJson('/api/systems/'.$system->id.'/memberships', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['user_id']);
});

test('store rejects nonexistent user_id', function (): void {
    $admin = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    actingAs($admin);

    postJson('/api/systems/'.$system->id.'/memberships', ['user_id' => 'does-not-exist'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['user_id']);
});

test('store rejects duplicate user in same system', function (): void {
    $admin = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $user = User::factory()->create();
    Membership::factory()->for($user)->for($system)->create();
    actingAs($admin);

    postJson('/api/systems/'.$system->id.'/memberships', ['user_id' => $user->id])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['user_id']);
});

test('store returns 404 for unknown system', function (): void {
    $admin = User::factory()->superAdmin()->create();
    actingAs($admin);

    postJson('/api/systems/nonexistent/memberships', ['user_id' => $admin->id])
        ->assertNotFound();
});

test('store is forbidden for regular user', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/memberships', ['user_id' => $user->id])
        ->assertForbidden();
});

// ── update ───────────────────────────────────────────────────────────────────

test('update promotes a member to admin', function (): void {
    $admin = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $membership = Membership::factory()->for($system)->create(['admin' => false]);
    actingAs($admin);

    $response = patchJson('/api/systems/'.$system->id.'/memberships/'.$membership->id, ['admin' => true])
        ->assertSuccessful();

    $response->assertJsonPath('data.admin', true);
    assertDatabaseHas('memberships', ['id' => $membership->id, 'admin' => true]);
});

test('update requires admin field', function (): void {
    $admin = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $membership = Membership::factory()->for($system)->create();
    actingAs($admin);

    patchJson('/api/systems/'.$system->id.'/memberships/'.$membership->id, [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['admin']);
});

test('update is forbidden for regular user', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $membership = Membership::factory()->for($system)->create();
    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/memberships/'.$membership->id, ['admin' => true])
        ->assertForbidden();
});

// ── destroy ───────────────────────────────────────────────────────────────────

test('destroy removes a membership', function (): void {
    $admin = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $membership = Membership::factory()->for($system)->create();
    actingAs($admin);

    deleteJson('/api/systems/'.$system->id.'/memberships/'.$membership->id)
        ->assertNoContent();

    assertDatabaseMissing('memberships', ['id' => $membership->id]);
});

test('destroy returns 404 for unknown membership', function (): void {
    $admin = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    actingAs($admin);

    deleteJson('/api/systems/'.$system->id.'/memberships/nonexistent')
        ->assertNotFound();
});

test('destroy is forbidden for regular user', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $membership = Membership::factory()->for($system)->create();
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/memberships/'.$membership->id)
        ->assertForbidden();
});
