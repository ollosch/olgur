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

test('index returns memberships to system admins', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    Membership::factory()->for($system)->count(2)->create();
    actingAs($admin);

    $response = getJson('/api/systems/'.$system->id.'/memberships')
        ->assertSuccessful();

    expect($response->json('data'))->toHaveCount(3); // admin + 2 others
});

test('index is forbidden for non-admin members', function (): void {
    $system = System::factory()->create();
    $member = User::factory()->create();
    Membership::factory()->for($member)->for($system)->create(['admin' => false]);
    actingAs($member);

    getJson('/api/systems/'.$system->id.'/memberships')
        ->assertForbidden();
});

test('index is forbidden for users not in the system', function (): void {
    $system = System::factory()->create();
    actingAs(User::factory()->create());

    getJson('/api/systems/'.$system->id.'/memberships')
        ->assertForbidden();
});

test('index does not return memberships from other systems', function (): void {
    $system = System::factory()->create();
    $other = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    Membership::factory()->for($other)->count(2)->create();
    actingAs($admin);

    $response = getJson('/api/systems/'.$system->id.'/memberships')
        ->assertSuccessful();

    expect($response->json('data'))->toHaveCount(1); // only the admin's own membership
});

test('index returns 404 for unknown system', function (): void {
    actingAs(User::factory()->create());

    getJson('/api/systems/nonexistent/memberships')->assertNotFound();
});

// ── store ────────────────────────────────────────────────────────────────────

test('user can join a system themselves', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/memberships')
        ->assertCreated();

    $response->assertJsonPath('data.user_id', $user->id);
    $response->assertJsonPath('data.system_id', $system->id);
    $response->assertJsonPath('data.admin', false);

    assertDatabaseHas('memberships', ['user_id' => $user->id, 'system_id' => $system->id]);
});

test('regular user cannot self-promote to admin', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/memberships', [
        'user_id' => $user->id,
        'admin' => true,
    ])->assertCreated();

    $response->assertJsonPath('data.admin', false);
    assertDatabaseHas('memberships', ['user_id' => $user->id, 'system_id' => $system->id, 'admin' => false]);
});

test('system admin can add another user to the system', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    $user = User::factory()->create();
    actingAs($admin);

    $response = postJson('/api/systems/'.$system->id.'/memberships', [
        'user_id' => $user->id,
    ])->assertCreated();

    $response->assertJsonPath('data.user_id', $user->id);
    assertDatabaseHas('memberships', ['user_id' => $user->id, 'system_id' => $system->id]);
});

test('system admin can add another user as admin', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    $user = User::factory()->create();
    actingAs($admin);

    $response = postJson('/api/systems/'.$system->id.'/memberships', [
        'user_id' => $user->id,
        'admin' => true,
    ])->assertCreated();

    $response->assertJsonPath('data.admin', true);
});

test('regular user cannot add another user to the system', function (): void {
    $system = System::factory()->create();
    $user = User::factory()->create();
    $other = User::factory()->create();
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/memberships', ['user_id' => $other->id])
        ->assertForbidden();
});

test('store returns 409 when user is already a member', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Membership::factory()->for($user)->for($system)->create();
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/memberships')
        ->assertStatus(409);
});

test('store rejects nonexistent user_id', function (): void {
    $admin = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    actingAs($admin);

    postJson('/api/systems/'.$system->id.'/memberships', ['user_id' => 'does-not-exist'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['user_id']);
});

test('store rejects duplicate user_id when provided', function (): void {
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
    actingAs(User::factory()->superAdmin()->create());

    postJson('/api/systems/nonexistent/memberships')->assertNotFound();
});

// ── update ───────────────────────────────────────────────────────────────────

test('system admin can promote a member to admin', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
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

test('update is forbidden for non-admin members', function (): void {
    $system = System::factory()->create();
    $member = User::factory()->create();
    Membership::factory()->for($member)->for($system)->create(['admin' => false]);
    $membership = Membership::factory()->for($system)->create();
    actingAs($member);

    patchJson('/api/systems/'.$system->id.'/memberships/'.$membership->id, ['admin' => true])
        ->assertForbidden();
});

// ── destroy ───────────────────────────────────────────────────────────────────

test('system admin can remove a member from the system', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    $membership = Membership::factory()->for($system)->create();
    actingAs($admin);

    deleteJson('/api/systems/'.$system->id.'/memberships/'.$membership->id)
        ->assertNoContent();

    assertDatabaseMissing('memberships', ['id' => $membership->id]);
});

test('user can remove themselves from a system', function (): void {
    $system = System::factory()->create();
    $user = User::factory()->create();
    $membership = Membership::factory()->for($user)->for($system)->create();
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/memberships/'.$membership->id)
        ->assertNoContent();

    assertDatabaseMissing('memberships', ['id' => $membership->id]);
});

test('user cannot remove another user from a system', function (): void {
    $system = System::factory()->create();
    $user = User::factory()->create();
    Membership::factory()->for($user)->for($system)->create();
    $other = User::factory()->create();
    $otherMembership = Membership::factory()->for($other)->for($system)->create();
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/memberships/'.$otherMembership->id)
        ->assertForbidden();
});

test('destroy returns 404 for unknown membership', function (): void {
    $admin = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    actingAs($admin);

    deleteJson('/api/systems/'.$system->id.'/memberships/nonexistent')
        ->assertNotFound();
});
