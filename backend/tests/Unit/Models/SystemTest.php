<?php

declare(strict_types=1);

use App\Models\System;
use App\Models\User;
use Carbon\CarbonImmutable;

test('to array', function (): void {
    $system = System::factory()->create()->refresh();

    expect(array_keys($system->toArray()))
        ->toBe([
            'id',
            'owner_id',
            'name',
            'description',
            'created_at',
            'updated_at',
        ]);
});

test('casts attributes correctly', function (): void {
    $system = System::factory()->create();

    expect($system->id)->toBeInt()
        ->and($system->owner_id)->toBeInt()
        ->and($system->name)->toBeString()
        ->and($system->description)->toBeString()
        ->and($system->created_at)->toBeInstanceOf(CarbonImmutable::class)
        ->and($system->updated_at)->toBeInstanceOf(CarbonImmutable::class);
});

test('belongs to owner', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create(['owner_id' => $user->id]);

    expect($system->owner)->toBeInstanceOf(User::class)
        ->and($system->owner->id)->toBe($user->id);
});
