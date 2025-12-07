<?php

declare(strict_types=1);

use App\Models\System;
use App\Models\User;
use Carbon\CarbonImmutable;

test('to array', function (): void {
    $user = User::factory()->create()->refresh();

    expect(array_keys($user->toArray()))
        ->toBe([
            'id',
            'name',
            'email',
            'email_verified_at',
            'created_at',
            'updated_at',
        ]);
});

test('casts attributes correctly', function (): void {
    $user = User::factory()->create();

    expect($user->id)->toBeString()->toHaveLength(26)
        ->and($user->name)->toBeString()
        ->and($user->email)->toBeString()
        ->and($user->email_verified_at)->toBeInstanceOf(CarbonImmutable::class)
        ->and($user->created_at)->toBeInstanceOf(CarbonImmutable::class)
        ->and($user->updated_at)->toBeInstanceOf(CarbonImmutable::class);
});

test('has many systems', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create(['owner_id' => $user->id]);

    expect($user->systems->contains($system))->toBeTrue();
});
