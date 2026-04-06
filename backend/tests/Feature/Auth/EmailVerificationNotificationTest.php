<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\postJson;

test('an unverified user can request a verification email', function (): void {
    Notification::fake();

    $user = User::factory()->unverified()->create();

    actingAs($user)
        ->postJson('/api/email/verification-notification')
        ->assertOk()
        ->assertJson(['status' => 'Verification link sent']);

    Notification::assertSentTo($user, VerifyEmail::class);
});

test('a verified user gets a notice instead of a new email', function (): void {
    Notification::fake();

    $user = User::factory()->create(); // email_verified_at set by default

    actingAs($user)
        ->postJson('/api/email/verification-notification')
        ->assertOk()
        ->assertJson(['status' => 'Email already verified']);

    Notification::assertNothingSent();
});

test('a guest cannot request a verification email', function (): void {
    postJson('/api/email/verification-notification')
        ->assertUnauthorized()
        ->assertJson(['message' => 'Unauthenticated.']);
});
