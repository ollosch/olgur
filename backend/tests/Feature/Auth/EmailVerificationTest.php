<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;

use function Pest\Laravel\actingAs;

test('email can be verified', function (): void {
    $user = User::factory()->unverified()->create();

    Event::fake();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1($user->email)]
    );

    actingAs($user, 'sanctum')
        ->getJson($verificationUrl);

    Event::assertDispatched(Verified::class);
    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
});

test('email is not verified with invalid hash', function (): void {
    $user = User::factory()->unverified()->create();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1('wrong-email')]
    );

    actingAs($user, 'sanctum')
        ->getJson($verificationUrl);

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('cannot access protected routes if not verified', function (): void {
    $user = User::factory()->unverified()->create();

    Route::get('/test-protected', fn () => response()->json(['message' => 'success']))
        ->middleware(['auth:sanctum', 'verified']);

    actingAs($user, 'sanctum')
        ->getJson('/test-protected')
        ->assertForbidden();
});
