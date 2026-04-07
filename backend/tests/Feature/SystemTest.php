<?php

declare(strict_types=1);

use App\Models\System;

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
