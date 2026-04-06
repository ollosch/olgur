<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Notification;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\postJson;

test('a guest can request a password reset link', function (): void {
    Notification::fake();

    $user = User::factory()->create();

    postJson('/api/forgot-password', ['email' => $user->email])
        ->assertOk()
        ->assertJson(['status' => __('passwords.sent')]);

    Notification::assertSentTo($user, ResetPassword::class);
});

test('no error is returned for an unknown email address', function (): void {
    Notification::fake();

    postJson('/api/forgot-password', ['email' => 'nobody@example.com'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');

    Notification::assertNothingSent();
});

test('email is required to request a reset link', function (): void {
    postJson('/api/forgot-password', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('email must be a valid email address to request a reset link', function (): void {
    postJson('/api/forgot-password', ['email' => 'not-an-email'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('an authenticated user cannot request a password reset link', function (): void {
    actingAs(User::factory()->create())
        ->postJson('/api/forgot-password', ['email' => 'jane@example.com'])
        ->assertForbidden()
        ->assertJson(['message' => 'Already authenticated.']);
});
