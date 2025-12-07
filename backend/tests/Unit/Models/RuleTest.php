<?php

declare(strict_types=1);

use App\Models\Module;
use App\Models\Rule;
use Carbon\CarbonImmutable;

test('to array', function (): void {
    $system = Rule::factory()->create()->refresh();

    expect(array_keys($system->toArray()))
        ->toBe([
            'id',
            'module_id',
            'mpath',
            'title',
            'content',
            'created_at',
            'updated_at',
        ]);
});

test('casts attributes correctly', function (): void {
    $rule = Rule::factory()->create();

    expect($rule->id)->toBeString()->toHaveLength(26)
        ->and($rule->module_id)->toBeString()->toHaveLength(26)
        ->and($rule->mpath)->toBeString()
        ->and($rule->title)->toBeString()
        ->and($rule->content)->toBeString()
        ->and($rule->created_at)->toBeInstanceOf(CarbonImmutable::class)
        ->and($rule->updated_at)->toBeInstanceOf(CarbonImmutable::class);
});

test('belongs to a module', function (): void {
    $module = Module::factory()->create();
    $rule = Rule::factory()->create(['module_id' => $module->id]);

    expect($rule->module)->toBeInstanceOf(Module::class)
        ->and($rule->module->id)->toBe($module->id);
});
