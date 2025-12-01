<?php

declare(strict_types=1);

use App\Models\Module;
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

test('has many modules', function (): void {
    $system = System::factory()->create();
    $modules = Module::factory()->create(['system_id' => $system->id]);

    expect($system->modules->count())->toBe(2)
        ->and($system->modules->pluck('id')->toArray())
        ->toMatchArray($modules->pluck('id')->toArray());
});

test('creates a \'core\' module when a system is created', function (): void {
    $system = System::factory()->create()->refresh();

    expect($system->modules)->toHaveCount(1)
        ->and($system->modules->first())->toBeInstanceOf(Module::class)
        ->and($system->modules->first()->type)->toBe('core');
});
