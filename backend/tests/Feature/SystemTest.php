<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\System;
use App\Models\User;

test('a system can be created with factory defaults', function (): void {
    $system = System::factory()->create();

    expect($system->id)->toBeString()
        ->and($system->slug)->toBeString()
        ->and($system->name)->toBeString()
        ->and($system->config)->toBeNull();
});

test('system slug is unique', function (): void {
    $system = System::factory()->create(['slug' => 'asl']);

    expect($system->slug)->toBe('asl');
});

test('system config is cast to array when set', function (): void {
    $system = System::factory()->withTocDepth(2)->create();

    expect($system->config)->toBeArray()
        ->and($system->config['toc_depth'])->toBe(2);
});

test('system config is null by default', function (): void {
    $system = System::factory()->create();
    $fresh = $system->fresh();

    expect($fresh->config)->toBeNull();
});

test('system uses ulid primary key', function (): void {
    $system = System::factory()->create();

    expect($system->id)->toBeString()->toHaveLength(26);
});

// ── System::isMember ──────────────────────────────────────────────────────

test('isMember returns true when user has a membership', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Membership::factory()->for($user)->for($system)->create();

    expect($system->isMember($user))->toBeTrue();
});

test('isMember returns false when user has no membership', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();

    expect($system->isMember($user))->toBeFalse();
});

// ── System::isAdmin ──────────────────────────────────────────────────────

test('isAdmin returns true when user is an admin', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Membership::factory()->for($user)->for($system)->admin()->create();

    expect($system->isAdmin($user))->toBeTrue();
});

test('isAdmin returns false when user is not an admin', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();

    expect($system->isAdmin($user))->toBeFalse();
});
