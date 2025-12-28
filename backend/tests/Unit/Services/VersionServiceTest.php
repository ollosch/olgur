<?php

declare(strict_types=1);

use App\Models\Module;
use App\Models\Rule;
use App\Services\VersionService;

test('it sets the filepath to the JSON file', function(): void {
    $module = Module::factory()->create();
    new VersionService()->createSnapshot($module, '1.0.0');

    expect($module->fresh()->versions()->first()->filepath)
        ->toEqual("/{$module->system->id}/{$module->id}.json");
});

test('it stores the rules JSON', function(): void {
    $module = Module::factory()
        ->has(Rule::factory()->count(20))
        ->create();
    new VersionService()->createSnapshot($module, '1.0.0');

    $module = $module->fresh();

    expect(storage_path("app/snapshots/{$module->versions()->first()->filepath}"))->toBeFile();
});

test('it stores the version name', function(): void {
    $module = Module::factory()->create();
    new VersionService()->createSnapshot($module, '1.0.0');

    expect($module->fresh()->versions()->first()->name)
        ->toEqual('1.0.0');
});

