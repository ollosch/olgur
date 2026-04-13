<?php

declare(strict_types=1);

use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\User;

test('a module_version can be created with factory defaults', function (): void {
    $moduleVersion = ModuleVersion::factory()->create();

    expect($moduleVersion->id)->toBeString()
        ->and($moduleVersion->module_id)->toBeString()
        ->and($moduleVersion->released_by)->toBeNull()
        ->and($moduleVersion->version_string)->toBeString()
        ->and($moduleVersion->released_at)->toBeNull();
});

test('module_version uses ulid primary key', function (): void {
    $moduleVersion = ModuleVersion::factory()->create();

    expect($moduleVersion->id)->toBeString()->toHaveLength(26);
});

test('released state sets released_at', function (): void {
    $moduleVersion = ModuleVersion::factory()->released()->create();

    expect($moduleVersion->released_at)->not->toBeNull();
});

test('released state sets released_by user', function (): void {
    $moduleVersion = ModuleVersion::factory()->released()->create();

    expect($moduleVersion->released_by)->toBeString()->toHaveLength(26);
});

test('module_version belongs to a module', function (): void {
    $module = Module::factory()->create();
    $moduleVersion = ModuleVersion::factory()->for($module)->create();

    expect($moduleVersion->module->id)->toBe($module->id);
});

test('module_version belongs to a user via released_by', function (): void {
    $user = User::factory()->create();
    $moduleVersion = ModuleVersion::factory()->released()->create(['released_by' => $user->id]);

    expect($moduleVersion->releasedBy->id)->toBe($user->id);
});

test('module has many module_versions', function (): void {
    $module = Module::factory()->create();
    ModuleVersion::factory()->for($module)->count(3)->create();

    expect($module->versions)->toHaveCount(3)
        ->and($module->versions->first())->toBeInstanceOf(ModuleVersion::class);
});

test('deleting a module cascades to its module_versions', function (): void {
    $module = Module::factory()->create();
    $moduleVersion = ModuleVersion::factory()->for($module)->create();

    $module->delete();

    expect(ModuleVersion::query()->find($moduleVersion->id))->toBeNull();
});
