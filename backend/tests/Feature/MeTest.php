<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;
use function Pest\Laravel\patchJson;

// ── Unauthenticated ──────────────────────────────────────────────────────────

it('returns 401 for unauthenticated users', function (): void {
    getJson('/api/me')->assertUnauthorized();
});

// ── Authenticated ────────────────────────────────────────────────────────────

it('returns the correct JSON structure for an authenticated user', function (): void {
    $user = User::factory()->create();
    actingAs($user);

    $response = getJson('/api/me')->assertSuccessful();

    $response->assertJsonPath('data.id', $user->id);
    $response->assertJsonPath('data.name', $user->name);
    $response->assertJsonPath('data.email', $user->email);
    $response->assertJsonPath('data.super_admin', false);
    $response->assertJsonStructure([
        'data' => [
            'id',
            'name',
            'email',
            'email_verified_at',
            'super_admin',
            'created_at',
            'updated_at',
        ],
    ]);
});

it('returns super_admin as true for a super_admin user', function (): void {
    $user = User::factory()->superAdmin()->create();
    actingAs($user);

    getJson('/api/me')
        ->assertSuccessful()
        ->assertJsonPath('data.super_admin', true);
});

it('returns super_admin as false for a regular user', function (): void {
    $user = User::factory()->create();
    actingAs($user);

    getJson('/api/me')
        ->assertSuccessful()
        ->assertJsonPath('data.super_admin', false);
});

// ── /me/memberships ───────────────────────────────────────────────────────────

it('returns 401 for unauthenticated users on memberships endpoint', function (): void {
    getJson('/api/me/memberships')->assertUnauthorized();
});

it('returns only the authenticated user memberships', function (): void {
    $user = User::factory()->create();
    $systemA = System::factory()->create();
    $systemB = System::factory()->create();
    Membership::factory()->for($user)->for($systemA)->create();
    Membership::factory()->for($user)->for($systemB)->create();
    // Another user's memberships should not appear
    Membership::factory()->for($systemA)->count(2)->create();
    actingAs($user);

    $response = getJson('/api/me/memberships')->assertSuccessful();

    expect($response->json('data'))->toHaveCount(2);
});

it('returns empty memberships when user has none', function (): void {
    actingAs(User::factory()->create());

    $response = getJson('/api/me/memberships')->assertSuccessful();

    expect($response->json('data'))->toBeEmpty();
});

// ── /me/subscriptions ─────────────────────────────────────────────────────────

it('returns 401 for unauthenticated users on subscriptions endpoint', function (): void {
    getJson('/api/me/subscriptions')->assertUnauthorized();
});

it('returns only the authenticated user subscriptions', function (): void {
    $user = User::factory()->create();
    Subscription::factory()->for($user)->count(3)->create();
    // Another user's subscriptions should not appear
    Subscription::factory()->count(2)->create();
    actingAs($user);

    $response = getJson('/api/me/subscriptions')->assertSuccessful();

    expect($response->json('data'))->toHaveCount(3);
});

it('returns empty subscriptions when user has none', function (): void {
    actingAs(User::factory()->create());

    $response = getJson('/api/me/subscriptions')->assertSuccessful();

    expect($response->json('data'))->toBeEmpty();
});

// ── PATCH /me ─────────────────────────────────────────────────────────────────

it('requires auth to update profile', function (): void {
    patchJson('/api/me', ['name' => 'New Name', 'email' => 'new@example.com'])
        ->assertUnauthorized();
});

it('updates the authenticated user profile', function (): void {
    $user = User::factory()->create();
    actingAs($user);

    $response = patchJson('/api/me', [
        'name' => 'Updated Name',
        'email' => 'updated@example.com',
    ])->assertSuccessful();

    $response->assertJsonPath('data.name', 'Updated Name');
    $response->assertJsonPath('data.email', 'updated@example.com');

    expect($user->fresh())
        ->name->toBe('Updated Name')
        ->email->toBe('updated@example.com');
});

it('validates name is required on profile update', function (): void {
    $user = User::factory()->create();
    actingAs($user);

    patchJson('/api/me', ['name' => '', 'email' => $user->email])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name']);
});

it('validates email is required on profile update', function (): void {
    $user = User::factory()->create();
    actingAs($user);

    patchJson('/api/me', ['name' => $user->name, 'email' => ''])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

it('validates email is unique on profile update', function (): void {
    $other = User::factory()->create();
    $user = User::factory()->create();
    actingAs($user);

    patchJson('/api/me', ['name' => $user->name, 'email' => $other->email])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

it('allows updating profile with the same email', function (): void {
    $user = User::factory()->create();
    actingAs($user);

    patchJson('/api/me', ['name' => $user->name, 'email' => $user->email])
        ->assertSuccessful();
});

// ── PATCH /me/memberships/{system} ────────────────────────────────────────────

it('returns 401 for unauthenticated users on update membership config endpoint', function (): void {
    $system = System::factory()->create();

    patchJson('/api/me/memberships/'.$system->id, ['config' => []])
        ->assertUnauthorized();
});

it('member can update their own membership config', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $membership = Membership::factory()->for($user)->for($system)->create();
    actingAs($user);

    $config = [
        'bookmarks' => [
            ['type' => 'rule', 'id' => 'abcdefghijklmnopqrstuvwxyz'],
        ],
    ];

    $response = patchJson('/api/me/memberships/'.$system->id, ['config' => $config])
        ->assertSuccessful();

    $response->assertJsonPath('data.id', $membership->id);

    $fresh = $membership->fresh();
    expect($fresh?->config?->bookmarks)->toBe([['type' => 'rule', 'id' => 'abcdefghijklmnopqrstuvwxyz']]);
});

it('returns 404 when user has no membership for the system', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    actingAs($user);

    patchJson('/api/me/memberships/'.$system->id, ['config' => ['bookmarks' => []]])
        ->assertNotFound();
});

it('requires config field on update membership config', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Membership::factory()->for($user)->for($system)->create();
    actingAs($user);

    patchJson('/api/me/memberships/'.$system->id, [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['config']);
});

it('rejects unknown bookmark types on update membership config', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Membership::factory()->for($user)->for($system)->create();
    actingAs($user);

    patchJson('/api/me/memberships/'.$system->id, [
        'config' => [
            'bookmarks' => [
                ['type' => 'unknown', 'id' => 'abc123'],
            ],
        ],
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['config.bookmarks.0.type']);
});

it('member can update ignored_tags in membership config', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $membership = Membership::factory()->for($user)->for($system)->create();
    actingAs($user);

    $response = patchJson('/api/me/memberships/'.$system->id, [
        'config' => [
            'ignored_tags' => ['topic-alpha', 'topic-beta'],
        ],
    ])->assertSuccessful();

    $response->assertJsonPath('data.config.ignored_tags', ['topic-alpha', 'topic-beta']);

    $fresh = $membership->fresh();
    expect($fresh?->config?->ignoredTags)->toBe(['topic-alpha', 'topic-beta']);
});

it('ignored_tags defaults to empty array when not set', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Membership::factory()->for($user)->for($system)->create();
    actingAs($user);

    $response = patchJson('/api/me/memberships/'.$system->id, [
        'config' => ['bookmarks' => []],
    ])->assertSuccessful();

    $response->assertJsonPath('data.config.ignored_tags', []);
});

it('updating a partial config merges with existing config fields', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $membership = Membership::factory()->for($user)->for($system)->create([
        'config' => ['bookmarks' => [['type' => 'rule', 'id' => 'abcdefghijklmnopqrstuvwxyz']], 'ignored_tags' => []],
    ]);
    actingAs($user);

    patchJson('/api/me/memberships/'.$system->id, [
        'config' => ['ignored_tags' => ['topic-alpha']],
    ])->assertSuccessful();

    $fresh = $membership->fresh();
    expect($fresh?->config?->bookmarks)->toBe([['type' => 'rule', 'id' => 'abcdefghijklmnopqrstuvwxyz']])
        ->and($fresh?->config?->ignoredTags)->toBe(['topic-alpha']);
});

it('rejects non-string values in ignored_tags', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Membership::factory()->for($user)->for($system)->create();
    actingAs($user);

    patchJson('/api/me/memberships/'.$system->id, [
        'config' => [
            'ignored_tags' => [123, 456],
        ],
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['config.ignored_tags.0']);
});
