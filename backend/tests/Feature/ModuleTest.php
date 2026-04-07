<?php

declare(strict_types=1);

use App\Models\Module;
use App\Models\System;
use Illuminate\Database\QueryException;

test('a module can be created with factory defaults', function (): void {
    $module = Module::factory()->create();

    expect($module->id)->toBeString()
        ->and($module->slug)->toBeString()
        ->and($module->name)->toBeString()
        ->and($module->is_core)->toBeFalse()
        ->and($module->config)->toBeNull();
});

test('module uses ulid primary key', function (): void {
    $module = Module::factory()->create();

    expect($module->id)->toBeString()->toHaveLength(26);
});

test('module slug is unique per system', function (): void {
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['slug' => 'core']);

    expect(fn () => Module::factory()->for($system)->create(['slug' => 'core']))
        ->toThrow(QueryException::class);
});

test('same slug is allowed across different systems', function (): void {
    Module::factory()->create(['slug' => 'core']);
    $other = Module::factory()->create(['slug' => 'core']);

    expect($other->exists)->toBeTrue();
});

test('module config is cast to array when set', function (): void {
    $module = Module::factory()->create(['config' => ['key' => 'value']]);

    expect($module->config)->toBeArray()
        ->and($module->config['key'])->toBe('value');
});

test('module is_core is cast to boolean', function (): void {
    $module = Module::factory()->core()->create();

    expect($module->is_core)->toBeBool()->toBeTrue();
});

test('module belongs to a system', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    expect($module->system->id)->toBe($system->id);
});

test('system has many modules ordered by sort_order', function (): void {
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['sort_order' => 10, 'slug' => 'expansion']);
    Module::factory()->for($system)->create(['sort_order' => 0, 'slug' => 'core']);

    $slugs = $system->modules->pluck('slug')->all();

    expect($slugs)->toBe(['core', 'expansion']);
});

test('deleting a system cascades to its modules', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    $system->delete();

    expect(Module::query()->find($module->id))->toBeNull();
});
