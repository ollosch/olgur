<?php

declare(strict_types=1);

use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;

// ── Unauthenticated ──────────────────────────────────────────────────────────

test('unauthenticated request is rejected', function (): void {
    $system = System::factory()->create();

    getJson(sprintf('/api/systems/%s/manifest', $system->id))
        ->assertUnauthorized();
});

// ── manifest content ─────────────────────────────────────────────────────────

test('manifest returns all modules with their latest version', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create(['name' => 'Core', 'sort_order' => 1]);
    $moduleB = Module::factory()->for($system)->create(['name' => 'Expansion', 'sort_order' => 2, 'slug' => 'expansion']);

    ModuleVersion::factory()->for($moduleA)->released()->create(['version_string' => '1.0', 'released_at' => now()->subDays(2)]);
    $versionA2 = ModuleVersion::factory()->for($moduleA)->released()->create(['version_string' => '2.0', 'released_at' => now()]);
    $versionB1 = ModuleVersion::factory()->for($moduleB)->released()->create(['version_string' => '1.0', 'released_at' => now()->subDay()]);

    actingAs($user);

    $response = getJson(sprintf('/api/systems/%s/manifest', $system->id))
        ->assertSuccessful();

    $modules = $response->json('data.modules');

    expect($modules)->toHaveCount(2);

    expect($modules[0]['module_id'])->toBe($moduleA->id)
        ->and($modules[0]['version_id'])->toBe($versionA2->id)
        ->and($modules[0]['version_string'])->toBe('2.0');

    expect($modules[1]['module_id'])->toBe($moduleB->id)
        ->and($modules[1]['version_id'])->toBe($versionB1->id)
        ->and($modules[1]['version_string'])->toBe('1.0');
});

test('manifest includes modules with no released version', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['name' => 'No Version', 'sort_order' => 1]);

    actingAs($user);

    $response = getJson(sprintf('/api/systems/%s/manifest', $system->id))
        ->assertSuccessful();

    $module = $response->json('data.modules.0');

    expect($module['version_id'])->toBeNull()
        ->and($module['version_string'])->toBeNull()
        ->and($module['released_at'])->toBeNull()
        ->and($module['files'])->toBeNull();
});

test('manifest file paths reference correct version ids', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create(['version_string' => '1.0']);

    actingAs($user);

    $response = getJson(sprintf('/api/systems/%s/manifest', $system->id))
        ->assertSuccessful();

    $files = $response->json('data.modules.0.files');

    expect($files['rules'])
        ->toStartWith('http')
        ->toContain($version->id)
        ->toContain('rules');

    expect($files['index'])
        ->toStartWith('http')
        ->toContain($version->id)
        ->toContain('index');

    expect($files['game-data'])
        ->toStartWith('http')
        ->toContain($version->id)
        ->toContain('game-data');
});

test('manifest returns 404 for unknown system', function (): void {
    $user = User::factory()->create();
    actingAs($user);

    getJson('/api/systems/nonexistent-id/manifest')
        ->assertNotFound();
});

test('core module has type core in manifest', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['is_core' => true]);

    actingAs($user);

    $response = getJson(sprintf('/api/systems/%s/manifest', $system->id))
        ->assertSuccessful();

    expect($response->json('data.modules.0.type'))->toBe('core');
});

test('expansion module has type expansion in manifest', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['is_core' => false]);

    actingAs($user);

    $response = getJson(sprintf('/api/systems/%s/manifest', $system->id))
        ->assertSuccessful();

    expect($response->json('data.modules.0.type'))->toBe('expansion');
});

// ── manifest structure ────────────────────────────────────────────────────────

test('manifest response contains system_id and name', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create(['name' => 'Advanced Squad Leader']);

    actingAs($user);

    $response = getJson(sprintf('/api/systems/%s/manifest', $system->id))
        ->assertSuccessful();

    expect($response->json('data.system_id'))->toBe($system->id)
        ->and($response->json('data.name'))->toBe('Advanced Squad Leader');
});

test('manifest modules include required fields', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    ModuleVersion::factory()->for($module)->released()->create(['version_string' => '1.0']);

    actingAs($user);

    $response = getJson(sprintf('/api/systems/%s/manifest', $system->id))
        ->assertSuccessful();

    $response->assertJsonStructure([
        'data' => [
            'system_id',
            'name',
            'modules' => [
                [
                    'module_id',
                    'module_name',
                    'slug',
                    'type',
                    'version_id',
                    'version_string',
                    'released_at',
                    'files',
                ],
            ],
        ],
    ]);
});

test('manifest returns modules ordered by sort_order', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['name' => 'Third', 'sort_order' => 3, 'slug' => 'third']);
    $first = Module::factory()->for($system)->create(['name' => 'First', 'sort_order' => 1, 'slug' => 'first']);
    Module::factory()->for($system)->create(['name' => 'Second', 'sort_order' => 2, 'slug' => 'second']);

    actingAs($user);

    $response = getJson(sprintf('/api/systems/%s/manifest', $system->id))
        ->assertSuccessful();

    $names = collect($response->json('data.modules'))->pluck('module_name')->all();
    expect($names)->toBe(['First', 'Second', 'Third']);
});
