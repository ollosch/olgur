<?php

declare(strict_types=1);

use App\Models\GameDatumVersion;
use App\Models\IndexEntryVersion;
use App\Models\Membership;
use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\RuleVersion;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;

function versionContentUrl(System $system, Module $module, ModuleVersion $version, string $kind): string
{
    return sprintf('/api/systems/%s/modules/%s/versions/%s/%s', $system->id, $module->id, $version->id, $kind);
}

// ── Unauthenticated ──────────────────────────────────────────────────────────

test('unauthenticated requests are rejected', function (string $kind): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    getJson(versionContentUrl($system, $module, $version, $kind))->assertUnauthorized();
})->with([
    'rules' => ['rules'],
    'index' => ['index'],
    'game-data' => ['game-data'],
]);

// ── happy paths (snapshot tables) ────────────────────────────────────────────

test('rules endpoint reads the rules snapshot table', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    RuleVersion::factory()->create([
        'module_version_id' => $version->id,
        'number' => 'A.1',
        'title' => 'Movement',
        'content' => 'Infantry move one hex.',
        'sort_order' => 1,
    ]);

    actingAs($user);

    getJson(versionContentUrl($system, $module, $version, 'rules'))
        ->assertSuccessful()
        ->assertJsonFragment(['number' => 'A.1'])
        ->assertJsonFragment(['title' => 'Movement'])
        ->assertJsonFragment(['content' => 'Infantry move one hex.']);
});

test('index endpoint reads the index snapshot table', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    IndexEntryVersion::factory()->create([
        'module_version_id' => $version->id,
        'term' => 'Firepower',
        'definition' => 'A measure of attack strength.',
    ]);

    actingAs($user);

    getJson(versionContentUrl($system, $module, $version, 'index'))
        ->assertSuccessful()
        ->assertJsonFragment(['term' => 'Firepower']);
});

test('game-data endpoint reads the game data snapshot table', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    GameDatumVersion::factory()->create([
        'module_version_id' => $version->id,
        'name' => 'PzKpfw IB',
    ]);

    actingAs($user);

    getJson(versionContentUrl($system, $module, $version, 'game-data'))
        ->assertSuccessful()
        ->assertJsonFragment(['name' => 'PzKpfw IB']);
});

// ── version belongs to module ────────────────────────────────────────────────

test('returns 404 when the version does not belong to the module', function (string $kind): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($moduleA)->create();
    $version = ModuleVersion::factory()->for($moduleB)->released()->create();

    actingAs($user);

    getJson(versionContentUrl($system, $moduleA, $version, $kind))->assertNotFound();
})->with([
    'rules' => ['rules'],
    'index' => ['index'],
    'game-data' => ['game-data'],
]);

// ── authorization ────────────────────────────────────────────────────────────

test('a subscriber can read released content', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    RuleVersion::factory()->create(['module_version_id' => $version->id]);

    actingAs($user);

    getJson(versionContentUrl($system, $module, $version, 'rules'))->assertSuccessful();
});

test('a system admin can read released content without a subscription', function (): void {
    $admin = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    RuleVersion::factory()->create(['module_version_id' => $version->id]);

    actingAs($admin);

    getJson(versionContentUrl($system, $module, $version, 'rules'))->assertSuccessful();
});

test('a user without membership or subscription is forbidden', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    RuleVersion::factory()->create(['module_version_id' => $version->id]);

    actingAs($user);

    getJson(versionContentUrl($system, $module, $version, 'rules'))->assertForbidden();
});

test('an unreleased version is forbidden', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();
    $version = ModuleVersion::factory()->for($module)->create(['released_at' => null]);
    RuleVersion::factory()->create(['module_version_id' => $version->id]);

    actingAs($user);

    getJson(versionContentUrl($system, $module, $version, 'rules'))->assertForbidden();
});

// ── cached payload has no user-specific data ─────────────────────────────────

test('released payload contains only snapshot content fields', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    RuleVersion::factory()->create(['module_version_id' => $version->id]);

    actingAs($user);

    $response = getJson(versionContentUrl($system, $module, $version, 'rules'))
        ->assertSuccessful();

    $response->assertJsonStructure([
        '*' => ['id', 'rule_id', 'module_version_id', 'parent_id', 'number', 'title', 'content', 'sort_order'],
    ]);
});
