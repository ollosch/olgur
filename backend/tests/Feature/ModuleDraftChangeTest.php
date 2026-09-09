<?php

declare(strict_types=1);

use App\Models\GameDatum;
use App\Models\IndexEntry;
use App\Models\Membership;
use App\Models\Module;
use App\Models\ModuleDraftChange;
use App\Models\ModuleVersion;
use App\Models\Rule;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseCount;
use function Pest\Laravel\getJson;
use function Pest\Laravel\patchJson;
use function Pest\Laravel\postJson;

// ── draft change recording ────────────────────────────────────────────────────

test('updating a rule records a draft change', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create(['number' => 'A.1', 'title' => 'Title', 'content' => 'Old content.', 'markdown' => null, 'sort_order' => 1]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'number' => 'A.1',
        'title' => 'Title',
        'content' => 'New content.',
        'markdown' => null,
        'sort_order' => 1,
    ])->assertSuccessful();

    $change = ModuleDraftChange::query()
        ->where('module_id', $module->id)
        ->where('entity_type', 'rule')
        ->where('entity_id', $rule->id)
        ->first();

    expect($change)->not->toBeNull()
        ->and($change->content_after)->toBe(['content' => 'New content.'])
        ->and($change->change_type)->toBe('update')
        ->and($change->module_version_id)->toBeNull()
        ->and($change->changed_by)->toBe($user->id);
});

test('updating an index entry records a draft change', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create([
        'term' => 'Alpha',
        'definition' => 'Old def.',
        'notes' => 'Old notes.',
        'relations' => ['rule_refs' => [], 'see_also' => []],
    ]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id, [
        'term' => 'Alpha Updated',
        'definition' => 'New def.',
        'notes' => 'Old notes.',
        'relations' => ['rule_refs' => [], 'see_also' => []],
    ])->assertSuccessful();

    $change = ModuleDraftChange::query()
        ->where('module_id', $module->id)
        ->where('entity_type', 'index_entry')
        ->where('entity_id', $entry->id)
        ->first();

    expect($change)->not->toBeNull()
        ->and($change->content_after['definition'])->toBe('New def.')
        ->and($change->change_type)->toBe('update')
        ->and($change->module_version_id)->toBeNull()
        ->and($change->changed_by)->toBe($user->id);
});

test('updating a game datum records a draft change', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $gameDatum = GameDatum::factory()->for($module)->create(['content' => ['old' => true]]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data/'.$gameDatum->id, [
        'content' => ['updated' => true],
    ])->assertSuccessful();

    $change = ModuleDraftChange::query()
        ->where('module_id', $module->id)
        ->where('entity_type', 'game_datum')
        ->where('entity_id', $gameDatum->id)
        ->first();

    expect($change)->not->toBeNull()
        ->and($change->content_after)->toBe(['content' => ['updated' => true]])
        ->and($change->change_type)->toBe('update')
        ->and($change->module_version_id)->toBeNull()
        ->and($change->changed_by)->toBe($user->id);
});

// ── PublishModuleVersion stamps draft changes ─────────────────────────────────

test('publishing a version stamps pending draft changes with the version id', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();

    ModuleDraftChange::factory()->create([
        'module_id' => $module->id,
        'module_version_id' => null,
        'entity_id' => $rule->id,
    ]);

    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [
        'version_string' => '1.0',
        'notes' => 'First release.',
    ])->assertCreated();

    $versionId = $response->json('data.id');

    $change = ModuleDraftChange::query()->where('module_id', $module->id)->first();
    expect($change->module_version_id)->toBe($versionId);
});

test('publishing does not stamp draft changes from other modules', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($moduleB)->create();

    ModuleDraftChange::factory()->create([
        'module_id' => $moduleB->id,
        'module_version_id' => null,
        'entity_id' => $rule->id,
    ]);

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$moduleA->id.'/versions', [
        'version_string' => '1.0',
        'notes' => 'First release.',
    ])->assertCreated();

    $change = ModuleDraftChange::query()->where('module_id', $moduleB->id)->first();
    expect($change->module_version_id)->toBeNull();
});

// ── GET draft-changes ─────────────────────────────────────────────────────────

test('draft-changes: unauthenticated request is rejected', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/draft-changes')
        ->assertUnauthorized();
});

test('draft changes returns all changes for the module ordered by changed_at', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();

    ModuleDraftChange::factory()->create([
        'module_id' => $module->id,
        'entity_id' => $rule->id,
        'change_type' => 'update',
        'changed_at' => now()->subHour(),
        'content_after' => ['content' => 'First'],
    ]);
    ModuleDraftChange::factory()->create([
        'module_id' => $module->id,
        'entity_id' => $rule->id,
        'change_type' => 'update',
        'changed_at' => now(),
        'content_after' => ['content' => 'Second'],
    ]);

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/draft-changes')
        ->assertSuccessful();

    expect($response->json('data'))->toHaveCount(2);
    $first = $response->json('data.0');
    expect($first['content_after']['content'])->toBe('First');
});

test('draft changes does not return changes from other modules', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($moduleB)->create();

    ModuleDraftChange::factory()->create([
        'module_id' => $moduleB->id,
        'entity_id' => $rule->id,
    ]);

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$moduleA->id.'/draft-changes')
        ->assertSuccessful();

    expect($response->json('data'))->toBeEmpty();
});

test('regular user cannot view draft changes', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/draft-changes')
        ->assertForbidden();
});

test('module subscriber can view draft changes', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/draft-changes')
        ->assertSuccessful();
});

test('system admin can view draft changes', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Membership::factory()->for($user)->for($system)->admin()->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/draft-changes')
        ->assertSuccessful();
});

// ── manifest revision ─────────────────────────────────────────────────────────

test('manifest files URLs include revision query param when revision is greater than zero', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create([
        'version_string' => '1.0',
        'revision' => 3,
    ]);
    Membership::factory()->for($user)->for($system)->create();

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/manifest')
        ->assertSuccessful();

    $content = $response->json('data.modules.0.content');

    expect($content['rules'])->toContain('?rev=3')
        ->and($content['index'])->toContain('?rev=3')
        ->and($content['game-data'])->toContain('?rev=3');
});

test('manifest files URLs do not include revision query param when revision is zero', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    ModuleVersion::factory()->for($module)->released()->create([
        'version_string' => '1.0',
        'revision' => 0,
    ]);
    Membership::factory()->for($user)->for($system)->create();

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/manifest')
        ->assertSuccessful();

    $content = $response->json('data.modules.0.content');

    expect($content['rules'])->not->toContain('?rev=')
        ->and($content['index'])->not->toContain('?rev=')
        ->and($content['game-data'])->not->toContain('?rev=');
});

test('draft changes resource includes all required fields', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    ModuleDraftChange::factory()->create([
        'module_id' => $module->id,
        'module_version_id' => $version->id,
        'entity_id' => $rule->id,
        'entity_type' => 'rule',
        'change_type' => 'update',
        'content_after' => ['content' => 'X'],
        'changed_by' => $user->id,
        'changed_at' => now(),
    ]);

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/draft-changes')
        ->assertSuccessful();

    $response->assertJsonStructure([
        'data' => [
            [
                'id',
                'module_id',
                'module_version_id',
                'entity_type',
                'entity_id',
                'change_type',
                'description',
                'content_after',
                'changed_by',
                'changed_at',
            ],
        ],
    ]);
});

test('multiple rule updates each record their own draft change', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create(['number' => 'B.1', 'title' => 'T', 'content' => 'V0.', 'markdown' => null, 'sort_order' => 1]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'number' => 'B.1',
        'title' => 'T',
        'content' => 'Version 1.',
        'markdown' => null,
        'sort_order' => 1,
    ])->assertSuccessful();

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'number' => 'B.1',
        'title' => 'T',
        'content' => 'Version 2.',
        'markdown' => null,
        'sort_order' => 1,
    ])->assertSuccessful();

    assertDatabaseCount('module_draft_changes', 2);
});

// ── model relationships ───────────────────────────────────────────────────────

test('draft change belongs to its module', function (): void {
    $module = Module::factory()->create();
    $change = ModuleDraftChange::factory()->create(['module_id' => $module->id]);

    expect($change->module->id)->toBe($module->id);
});

test('draft change belongs to a module version when stamped', function (): void {
    $version = ModuleVersion::factory()->released()->create();
    $change = ModuleDraftChange::factory()->create(['module_version_id' => $version->id]);

    expect($change->moduleVersion->id)->toBe($version->id);
});

test('draft change belongs to the user who changed it', function (): void {
    $user = User::factory()->create();
    $change = ModuleDraftChange::factory()->create(['changed_by' => $user->id]);

    expect($change->changedBy->id)->toBe($user->id);
});
