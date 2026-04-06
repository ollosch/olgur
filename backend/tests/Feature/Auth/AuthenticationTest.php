<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Testing\Fluent\AssertableJson;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertAuthenticated;
use function Pest\Laravel\postJson;

test('a guest can log in with valid credentials', function (): void {
    $user = User::factory()->create();

    postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password',
    ])
        ->assertNoContent();

    assertAuthenticated();
});

test('invalid password returns a validation error', function (): void {
    $user = User::factory()->create();

    postJson('/api/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('non-existent email returns a validation error', function (): void {
    postJson('/api/login', [
        'email' => 'nobody@example.com',
        'password' => 'password',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('email is required to log in', function (): void {
    postJson('/api/login', [
        'password' => 'password',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('password is required to log in', function (): void {
    postJson('/api/login', [
        'email' => 'jane@example.com',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});

test('rate limiter locks out after 5 failed attempts', function (): void {
    Event::fake();

    $user = User::factory()->create();

    foreach (range(1, 5) as $attempt) {
        postJson('/api/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])
            ->assertUnprocessable();
    }

    postJson('/api/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ])
        ->assertUnprocessable()
        ->assertJson(
            fn (AssertableJson $json): AssertableJson => $json
                ->where('errors.email.0', fn (string $message): bool => $message !== __('auth.failed'))
                ->etc()
        );

    Event::assertDispatched(Lockout::class);
});

test('rate limiter is cleared after a successful login', function (): void {
    $user = User::factory()->create();

    foreach (range(1, 3) as $attempt) {
        postJson('/api/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);
    }

    postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password',
    ])
        ->assertNoContent();

    $throttleKey = Str::transliterate(Str::lower($user->email).'|'.request()->ip());
    expect(RateLimiter::attempts($throttleKey))->toBe(0);
});

test('an authenticated user cannot log in', function (): void {
    actingAs(User::factory()->create())
        ->postJson('/api/login', [
            'email' => 'jane@example.com',
            'password' => 'password',
        ])
        ->assertForbidden()
        ->assertJson(['message' => 'Already authenticated.']);
});
