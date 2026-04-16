<?php

declare(strict_types=1);

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
