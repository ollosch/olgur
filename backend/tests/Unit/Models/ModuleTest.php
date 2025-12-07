<?php

declare(strict_types=1);

use App\Models\Module;
use App\Models\Rule;
use App\Models\System;
use Carbon\CarbonImmutable;

test('to array', function (): void {
    $system = Module::factory()->create()->refresh();

    expect(array_keys($system->toArray()))
        ->toBe([
            'id',
            'system_id',
            'type',
            'name',
            'description',
            'created_at',
            'updated_at',
        ]);
});

test('casts attributes correctly', function (): void {
    $module = Module::factory()->create();

    expect($module->id)->toBeString()->toHaveLength(26)
        ->and($module->system_id)->toBeString()->toHaveLength(26)
        ->and($module->type)->toBeString()
        ->and($module->name)->toBeString()
        ->and($module->description)->toBeString()
        ->and($module->created_at)->toBeInstanceOf(CarbonImmutable::class)
        ->and($module->updated_at)->toBeInstanceOf(CarbonImmutable::class);
});

test('belongs to system', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->create(['system_id' => $system->id]);

    expect($module->system)->toBeInstanceOf(System::class)
        ->and($module->system->id)->toBe($system->id);
});

test('has many rules', function (): void {
    $module = Module::factory()->create();
    $rules = Rule::factory()->count(2)->create(['module_id' => $module->id]);

    expect($module->rules)->toHaveCount(2)
        ->each
        ->toBeInstanceOf(Rule::class)
        ->and($module->rules->modelKeys())
        ->toEqualCanonicalizing($rules->modelKeys());
});
