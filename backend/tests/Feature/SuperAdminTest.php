<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Gate;

use function Pest\Laravel\actingAs;

test('super_admin defaults to false for new users', function (): void {
    $user = User::factory()->create();

    expect($user->super_admin)->toBeFalse();
});

test('super_admin factory state sets super_admin to true', function (): void {
    $user = User::factory()->superAdmin()->create();

    expect($user->super_admin)->toBeTrue();
});

test('super_admin bypasses all gate checks', function (): void {
    $superAdmin = User::factory()->superAdmin()->create();

    actingAs($superAdmin);

    expect(Gate::allows('any-arbitrary-ability'))->toBeTrue();
});

test('regular user does not bypass gate checks', function (): void {
    $user = User::factory()->create();

    actingAs($user);

    expect(Gate::allows('any-arbitrary-ability'))->toBeFalse();
});

test('super_admin is cast to boolean', function (): void {
    $user = User::factory()->superAdmin()->create();
    $fresh = $user->fresh();

    expect($fresh->super_admin)->toBeBool()->toBeTrue();
});
