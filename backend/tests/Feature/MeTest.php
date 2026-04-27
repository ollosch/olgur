<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;

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
