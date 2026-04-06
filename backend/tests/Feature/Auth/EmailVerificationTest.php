<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;

test('a user can verify their email with a valid signed link', function (): void {
    Event::fake();

    $user = User::factory()->unverified()->create();

    $url = URL::signedRoute('verification.verify', [
        'id' => $user->getKey(),
        'hash' => sha1((string) $user->email),
    ]);

    actingAs($user)
        ->getJson($url)
        ->assertOk()
        ->assertJson(['status' => 'Email verified successfully']);

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();

    Event::assertDispatched(Verified::class);
});

test('verification fires no event when email is already verified', function (): void {
    Event::fake();

    $user = User::factory()->create(); // email_verified_at set by default

    $url = URL::signedRoute('verification.verify', [
        'id' => $user->getKey(),
        'hash' => sha1((string) $user->email),
    ]);

    actingAs($user)
        ->getJson($url)
        ->assertOk()
        ->assertJson(['status' => 'Email already verified']);

    Event::assertNotDispatched(Verified::class);
});

test('verification fails when the hash does not match', function (): void {
    $user = User::factory()->unverified()->create();

    $url = URL::signedRoute('verification.verify', [
        'id' => $user->getKey(),
        'hash' => sha1('wrong@email.com'),
    ]);

    actingAs($user)
        ->getJson($url)
        ->assertForbidden();
});

test('verification fails with a tampered signature', function (): void {
    $user = User::factory()->unverified()->create();

    $url = URL::signedRoute('verification.verify', [
        'id' => $user->getKey(),
        'hash' => sha1((string) $user->email),
    ]);

    actingAs($user)
        ->getJson($url.'tampered')
        ->assertForbidden();
});

test('a guest cannot verify an email', function (): void {
    $user = User::factory()->unverified()->create();

    $url = URL::signedRoute('verification.verify', [
        'id' => $user->getKey(),
        'hash' => sha1((string) $user->email),
    ]);

    getJson($url)
        ->assertUnauthorized()
        ->assertJson(['message' => 'Unauthenticated.']);
});
