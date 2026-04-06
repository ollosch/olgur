<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Event;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertAuthenticated;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\postJson;

test('a guest can register with valid data', function (): void {
    $response = postJson('/api/register', [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertNoContent();

    assertDatabaseHas(User::class, [
        'email' => 'jane@example.com',
    ]);

    assertAuthenticated();
});

test('registration fires the Registered event', function (): void {
    Event::fake();

    postJson('/api/register', [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    Event::assertDispatched(Registered::class);
});

test('name is required to register', function (): void {
    postJson('/api/register', [
        'email' => 'jane@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('name');
});

test('email is required to register', function (): void {
    postJson('/api/register', [
        'name' => 'Jane Doe',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('email must be a valid email address', function (): void {
    postJson('/api/register', [
        'name' => 'Jane Doe',
        'email' => 'not-an-email',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('email must be lowercase', function (): void {
    postJson('/api/register', [
        'name' => 'Jane Doe',
        'email' => 'Jane@Example.COM',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('email must be unique', function (): void {
    User::factory()->create(['email' => 'jane@example.com']);

    postJson('/api/register', [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('password is required to register', function (): void {
    postJson('/api/register', [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});

test('password must be confirmed', function (): void {
    postJson('/api/register', [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'password' => 'password',
        'password_confirmation' => 'different',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});

test('password must be at least 8 characters', function (): void {
    postJson('/api/register', [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'password' => 'short',
        'password_confirmation' => 'short',
    ])->assertUnprocessable()->assertJsonValidationErrors('password');
});

test('an authenticated user cannot register', function (): void {
    actingAs(User::factory()->create())
        ->postJson('/api/register', [
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])
        ->assertForbidden()
        ->assertJson(['message' => 'Already authenticated.']);
});
