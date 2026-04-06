<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\postJson;

test('a user can reset their password with a valid token', function (): void {
    Event::fake();

    $user = User::factory()->create();
    $token = Password::createToken($user);

    postJson('/api/reset-password', [
        'token' => $token,
        'email' => $user->email,
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])
        ->assertOk()
        ->assertJson(['status' => __('passwords.reset')]);

    expect(Hash::check('new-password', $user->fresh()->password))->toBeTrue();

    Event::assertDispatched(PasswordReset::class);
});

test('an invalid token returns a validation error', function (): void {
    $user = User::factory()->create();

    postJson('/api/reset-password', [
        'token' => 'invalid-token',
        'email' => $user->email,
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('a token for the wrong user is rejected', function (): void {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $token = Password::createToken($other);

    postJson('/api/reset-password', [
        'token' => $token,
        'email' => $user->email,
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('token is required to reset password', function (): void {
    postJson('/api/reset-password', [
        'email' => 'jane@example.com',
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('token');
});

test('email is required to reset password', function (): void {
    postJson('/api/reset-password', [
        'token' => 'some-token',
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('password is required to reset password', function (): void {
    postJson('/api/reset-password', [
        'token' => 'some-token',
        'email' => 'jane@example.com',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});

test('password must be confirmed to reset password', function (): void {
    postJson('/api/reset-password', [
        'token' => 'some-token',
        'email' => 'jane@example.com',
        'password' => 'new-password',
        'password_confirmation' => 'different',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});

test('password must be at least 8 characters to reset password', function (): void {
    postJson('/api/reset-password', [
        'token' => 'some-token',
        'email' => 'jane@example.com',
        'password' => 'short',
        'password_confirmation' => 'short',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});

test('an authenticated user cannot reset a password', function (): void {
    actingAs(User::factory()->create())
        ->postJson('/api/reset-password', [
            'token' => 'some-token',
            'email' => 'jane@example.com',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
        ->assertForbidden()
        ->assertJson(['message' => 'Already authenticated.']);
});
