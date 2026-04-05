<?php

declare(strict_types=1);

use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertGuest;
use function Pest\Laravel\postJson;

test('an authenticated user can log out', function (): void {
    actingAs(User::factory()->create())
        ->postJson('/api/logout')
        ->assertNoContent();

    assertGuest();
});

test('a guest cannot log out', function (): void {
    postJson('/api/logout')
        ->assertUnauthorized()
        ->assertJson(['message' => 'Unauthenticated.']);
});
