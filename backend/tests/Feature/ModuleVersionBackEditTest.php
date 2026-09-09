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
use function Pest\Laravel\patchJson;

function amendUrl(System $system, Module $module, ModuleVersion $version): string
{
    return sprintf('/api/systems/%s/modules/%s/versions/%s/amend', $system->id, $module->id, $version->id);
}

// ── Unauthenticated ──────────────────────────────────────────────────────────

test('amend: unauthenticated requests are rejected', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    patchJson(amendUrl($system, $module, $version), [])->assertUnauthorized();
});

// ── happy path ───────────────────────────────────────────────────────────────

test('amend applies a rule back-edit and increments revision', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create(['revision' => 0]);
    $ruleVersion = RuleVersion::factory()->create([
        'module_version_id' => $version->id,
        'content' => 'Original content.',
    ]);

    actingAs($user);

    $response = patchJson(amendUrl($system, $module, $version), [
        'entity_type' => 'rule',
        'entity_id' => $ruleVersion->id,
        'expected_revision' => 0,
        'content' => ['content' => 'Corrected content.'],
    ])->assertSuccessful();

    $response->assertJsonPath('data.revision', 1);

    expect($ruleVersion->fresh()->content)->toBe('Corrected content.')
        ->and($version->fresh()->revision)->toBe(1);
});

test('amend applies an index entry back-edit', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    $entry = IndexEntryVersion::factory()->create([
        'module_version_id' => $version->id,
        'definition' => 'Old definition.',
        'notes' => 'Old notes.',
        'relations' => ['rule_refs' => ['1.1']],
    ]);

    actingAs($user);

    patchJson(amendUrl($system, $module, $version), [
        'entity_type' => 'index_entry',
        'entity_id' => $entry->id,
        'expected_revision' => 0,
        'content' => ['definition' => 'New definition.', 'notes' => 'New notes.'],
    ])->assertSuccessful();

    expect($entry->fresh()->definition)->toBe('New definition.')
        ->and($entry->fresh()->notes)->toBe('New notes.')
        ->and($version->fresh()->revision)->toBe(1);
});

test('amend does not change an index entry references field', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    $entry = IndexEntryVersion::factory()->create([
        'module_version_id' => $version->id,
        'relations' => ['rule_refs' => ['1.1']],
    ]);

    actingAs($user);

    patchJson(amendUrl($system, $module, $version), [
        'entity_type' => 'index_entry',
        'entity_id' => $entry->id,
        'expected_revision' => 0,
        'content' => ['relations' => ['rule_refs' => ['9.9']]],
    ])->assertSuccessful();

    expect($entry->fresh()->relations)->toBe(['rule_refs' => ['1.1']]);
});

test('amend applies a game datum back-edit', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    $gameDatum = GameDatumVersion::factory()->create([
        'module_version_id' => $version->id,
        'content' => ['old' => true],
    ]);

    actingAs($user);

    patchJson(amendUrl($system, $module, $version), [
        'entity_type' => 'game_datum',
        'entity_id' => $gameDatum->id,
        'expected_revision' => 0,
        'content' => ['content' => ['new' => true]],
    ])->assertSuccessful();

    expect($gameDatum->fresh()->content)->toBe(['new' => true])
        ->and($version->fresh()->revision)->toBe(1);
});

test('amend leaves the version string unchanged', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create(['version_string' => '1.4']);
    $ruleVersion = RuleVersion::factory()->create(['module_version_id' => $version->id]);

    actingAs($user);

    patchJson(amendUrl($system, $module, $version), [
        'entity_type' => 'rule',
        'entity_id' => $ruleVersion->id,
        'expected_revision' => 0,
        'content' => ['content' => 'Fixed.'],
    ])->assertSuccessful();

    expect($version->fresh()->version_string)->toBe('1.4')
        ->and($version->fresh()->revision)->toBe(1);
});

// ── optimistic concurrency ───────────────────────────────────────────────────

test('amend rejects a stale expected revision without changing content', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create(['revision' => 3]);
    $ruleVersion = RuleVersion::factory()->create([
        'module_version_id' => $version->id,
        'content' => 'Original.',
    ]);

    actingAs($user);

    patchJson(amendUrl($system, $module, $version), [
        'entity_type' => 'rule',
        'entity_id' => $ruleVersion->id,
        'expected_revision' => 2,
        'content' => ['content' => 'Should not apply.'],
    ])->assertConflict();

    expect($ruleVersion->fresh()->content)->toBe('Original.')
        ->and($version->fresh()->revision)->toBe(3);
});

test('amend rejects a non-latest version', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $older = ModuleVersion::factory()->for($module)->released()->create(['released_at' => now()->subDay()]);
    ModuleVersion::factory()->for($module)->released()->create(['released_at' => now()]);
    $ruleVersion = RuleVersion::factory()->create(['module_version_id' => $older->id]);

    actingAs($user);

    patchJson(amendUrl($system, $module, $older), [
        'entity_type' => 'rule',
        'entity_id' => $ruleVersion->id,
        'expected_revision' => 0,
        'content' => ['content' => 'Should not apply.'],
    ])->assertConflict();

    expect($older->fresh()->revision)->toBe(0);
});

// ── validation ───────────────────────────────────────────────────────────────

test('amend returns 422 for an invalid entity_type', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    actingAs($user);

    patchJson(amendUrl($system, $module, $version), [
        'entity_type' => 'invalid',
        'entity_id' => 'some-id',
        'expected_revision' => 0,
        'content' => ['content' => 'x'],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['entity_type']);
});

test('amend returns 422 when required fields are missing', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    actingAs($user);

    patchJson(amendUrl($system, $module, $version), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['entity_type', 'entity_id', 'expected_revision', 'content']);
});

test('amend returns 404 for an entity_id not belonging to the version', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    actingAs($user);

    patchJson(amendUrl($system, $module, $version), [
        'entity_type' => 'rule',
        'entity_id' => 'nonexistent-id',
        'expected_revision' => 0,
        'content' => ['content' => 'x'],
    ])->assertNotFound();
});

// ── authorization ────────────────────────────────────────────────────────────

test('regular user cannot amend', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    actingAs($user);

    patchJson(amendUrl($system, $module, $version), [
        'entity_type' => 'rule',
        'entity_id' => 'any-id',
        'expected_revision' => 0,
        'content' => ['content' => 'x'],
    ])->assertForbidden();
});

test('module subscriber cannot amend', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    actingAs($user);

    patchJson(amendUrl($system, $module, $version), [
        'entity_type' => 'rule',
        'entity_id' => 'any-id',
        'expected_revision' => 0,
        'content' => ['content' => 'x'],
    ])->assertForbidden();
});

test('module editor can amend', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    $ruleVersion = RuleVersion::factory()->create(['module_version_id' => $version->id]);

    actingAs($user);

    patchJson(amendUrl($system, $module, $version), [
        'entity_type' => 'rule',
        'entity_id' => $ruleVersion->id,
        'expected_revision' => 0,
        'content' => ['content' => 'Fixed.'],
    ])->assertSuccessful();
});

test('system admin can amend', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Membership::factory()->for($user)->for($system)->admin()->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    $ruleVersion = RuleVersion::factory()->create(['module_version_id' => $version->id]);

    actingAs($user);

    patchJson(amendUrl($system, $module, $version), [
        'entity_type' => 'rule',
        'entity_id' => $ruleVersion->id,
        'expected_revision' => 0,
        'content' => ['content' => 'Fixed.'],
    ])->assertSuccessful();
});
