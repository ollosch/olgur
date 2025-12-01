<?php

declare(strict_types=1);

use App\Models\Module;
use App\Models\Rule;
use App\Models\System;
use App\Models\SystemIndex;
use Carbon\CarbonImmutable;

test('to array', function (): void {
    $systemIndex = SystemIndex::factory()->create()->refresh();

    expect(array_keys($systemIndex->toArray()))
        ->toBe([
            'id',
            'system_id',
            'term',
            'definition',
            'references',
            'links',
            'created_at',
            'updated_at',
        ]);
});

test('casts attributes correctly', function (): void {
    $systemIndex = SystemIndex::factory()->create();

    expect($systemIndex->id)->toBeInt()
        ->and($systemIndex->system_id)->toBeInt()
        ->and($systemIndex->term)->toBeString()
        ->and($systemIndex->definition)->toBeString()
        ->and($systemIndex->references)->toBeString()
        ->and($systemIndex->links)->toBeString()
        ->and($systemIndex->created_at)->toBeInstanceOf(CarbonImmutable::class)
        ->and($systemIndex->updated_at)->toBeInstanceOf(CarbonImmutable::class);
});

test('belongs to a system', function (): void {
    $system = System::factory()->create();
    $systemIndex = SystemIndex::factory()->create(['system_id' => $system->id]);

    expect($systemIndex->system)->toBeInstanceOf(System::class)
        ->and($systemIndex->system->id)->toBe($system->id);
});
