<?php

declare(strict_types=1);

use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\System;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;

beforeEach(function (): void {
    Storage::fake('local');
});

function versionFileUrl(System $system, Module $module, ModuleVersion $version, string $type): string
{
    return '/api/systems/'.$system->id.'/modules/'.$module->id.'/versions/'.$version->id.'/'.$type;
}

// ── Unauthenticated ──────────────────────────────────────────────────────────

test('unauthenticated requests are rejected', function (string $path): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    $url = str_replace(['{system}', '{module}', '{version}'], [$system->id, $module->id, $version->id], $path);

    getJson($url)->assertUnauthorized();
})->with([
    'rules' => ['/api/systems/{system}/modules/{module}/versions/{version}/rules'],
    'index' => ['/api/systems/{system}/modules/{module}/versions/{version}/index'],
    'game-data' => ['/api/systems/{system}/modules/{module}/versions/{version}/game-data'],
]);

// ── rules endpoint ───────────────────────────────────────────────────────────

test('authenticated user can download the rules file', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    Storage::disk('local')->put(
        'versions/'.$version->id.'/rules.json',
        json_encode([['id' => 'test-rule', 'number' => 'A.1']])
    );

    actingAs($user);

    getJson(versionFileUrl($system, $module, $version, 'rules'))
        ->assertSuccessful()
        ->assertJsonFragment(['id' => 'test-rule']);
});

test('rules returns 404 when file does not exist on disk', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    // No file created

    actingAs($user);

    getJson(versionFileUrl($system, $module, $version, 'rules'))
        ->assertNotFound();
});

test('rules returns 404 when version does not belong to module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($moduleB)->released()->create();

    actingAs($user);

    getJson(versionFileUrl($system, $moduleA, $version, 'rules'))
        ->assertNotFound();
});

// ── index endpoint ───────────────────────────────────────────────────────────

test('authenticated user can download the index file', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    Storage::disk('local')->put(
        'versions/'.$version->id.'/index.json',
        json_encode([['id' => 'test-entry', 'term' => 'Alpha']])
    );

    actingAs($user);

    getJson(versionFileUrl($system, $module, $version, 'index'))
        ->assertSuccessful()
        ->assertJsonFragment(['id' => 'test-entry']);
});

test('index returns 404 when file does not exist on disk', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    actingAs($user);

    getJson(versionFileUrl($system, $module, $version, 'index'))
        ->assertNotFound();
});

test('index returns 404 when version does not belong to module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($moduleB)->released()->create();

    actingAs($user);

    getJson(versionFileUrl($system, $moduleA, $version, 'index'))
        ->assertNotFound();
});

// ── game-data endpoint ───────────────────────────────────────────────────────

test('authenticated user can download the game-data file', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    Storage::disk('local')->put(
        'versions/'.$version->id.'/game-data.json',
        json_encode([['id' => 'vehicle-2001', 'name' => 'PzKpfw IB']])
    );

    actingAs($user);

    getJson(versionFileUrl($system, $module, $version, 'game-data'))
        ->assertSuccessful()
        ->assertJsonFragment(['id' => 'vehicle-2001']);
});

test('game-data returns 404 when file does not exist on disk', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    actingAs($user);

    getJson(versionFileUrl($system, $module, $version, 'game-data'))
        ->assertNotFound();
});

test('game-data returns 404 when version does not belong to module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($moduleB)->released()->create();

    actingAs($user);

    getJson(versionFileUrl($system, $moduleA, $version, 'game-data'))
        ->assertNotFound();
});
