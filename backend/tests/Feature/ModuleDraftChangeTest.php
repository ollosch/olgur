<?php

declare(strict_types=1);

use App\Enums\DraftChangeClassification;
use App\Models\GameDatum;
use App\Models\IndexEntry;
use App\Models\Membership;
use App\Models\Module;
use App\Models\ModuleDraftChange;
use App\Models\ModuleVersion;
use App\Models\ModuleVersionReleaseNote;
use App\Models\Rule;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseCount;
use function Pest\Laravel\deleteJson;
use function Pest\Laravel\getJson;
use function Pest\Laravel\patchJson;
use function Pest\Laravel\postJson;

// ── draft change recording ────────────────────────────────────────────────────

test('updating a rule records a draft change with before and after state', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create(['number' => 'A.1', 'title' => 'Title', 'content' => 'Old content.', 'sort_order' => 1]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'number' => 'A.1',
        'title' => 'Title',
        'content' => 'New content.',
        'sort_order' => 1,
    ])->assertSuccessful();

    $change = ModuleDraftChange::query()
        ->where('module_id', $module->id)
        ->where('entity_type', 'rule')
        ->where('entity_id', $rule->id)
        ->first();

    expect($change)->not->toBeNull()
        ->and($change->change_type)->toBe('update')
        ->and($change->classification)->toBe(DraftChangeClassification::Semantic)
        ->and($change->content_before['content'])->toBe('Old content.')
        ->and($change->content_after['content'])->toBe('New content.')
        ->and($change->module_version_id)->toBeNull()
        ->and($change->changed_by)->toBe($user->id);
});

test('creating a rule records a draft change with null before state', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules', [
        'number' => 'A.1',
        'title' => 'Title',
        'content' => 'Content.',
        'sort_order' => 1,
    ])->assertCreated();

    $ruleId = $response->json('data.id');

    $change = ModuleDraftChange::query()
        ->where('module_id', $module->id)
        ->where('entity_type', 'rule')
        ->where('entity_id', $ruleId)
        ->first();

    expect($change)->not->toBeNull()
        ->and($change->change_type)->toBe('create')
        ->and($change->content_before)->toBeNull()
        ->and($change->content_after['content'])->toBe('Content.');
});

test('deleting a rule records a draft change with null after state', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create(['content' => 'Old content.']);

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id)
        ->assertNoContent();

    $change = ModuleDraftChange::query()
        ->where('module_id', $module->id)
        ->where('entity_type', 'rule')
        ->where('entity_id', $rule->id)
        ->first();

    expect($change)->not->toBeNull()
        ->and($change->change_type)->toBe('delete')
        ->and($change->classification)->toBe(DraftChangeClassification::Semantic)
        ->and($change->content_before['content'])->toBe('Old content.')
        ->and($change->content_after)->toBeNull();
});

test('deleting a rule accepts typo classification', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'classification' => 'typo',
    ])->assertNoContent();

    expect(ModuleDraftChange::query()->sole()->classification)->toBe(DraftChangeClassification::Typo);
});

test('a mutation may submit a typo classification', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create(['number' => 'A.1', 'title' => 'Title', 'content' => 'Old.', 'sort_order' => 1]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'number' => 'A.1',
        'title' => 'Title',
        'content' => 'New.',
        'sort_order' => 1,
        'classification' => 'typo',
    ])->assertSuccessful();

    $change = ModuleDraftChange::query()->where('module_id', $module->id)->first();

    expect($change->classification)->toBe(DraftChangeClassification::Typo);
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
        ->and($change->change_type)->toBe('update')
        ->and($change->content_before['definition'])->toBe('Old def.')
        ->and($change->content_after['definition'])->toBe('New def.')
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
        ->and($change->change_type)->toBe('update')
        ->and($change->content_before['content'])->toBe(['old' => true])
        ->and($change->content_after['content'])->toBe(['updated' => true]);
});

test('each live mutation advances the module draft revision', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create(['number' => 'A.1', 'title' => 'Title', 'content' => 'Old.', 'sort_order' => 1]);

    actingAs($user);

    expect($module->draft_revision)->toBe(0);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'number' => 'A.1',
        'title' => 'Title',
        'content' => 'New.',
        'sort_order' => 1,
    ])->assertSuccessful();

    expect($module->refresh()->draft_revision)->toBe(1);
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
        'classification' => DraftChangeClassification::Typo,
    ]);

    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [
        'version_string' => '1.0',
        'notes' => 'First release.',
        'expected_draft_revision' => 0,
        'release_notes' => [],
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
        'classification' => DraftChangeClassification::Typo,
    ]);

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$moduleA->id.'/versions', [
        'version_string' => '1.0',
        'notes' => 'First release.',
        'expected_draft_revision' => 0,
        'release_notes' => [],
    ])->assertCreated();

    $change = ModuleDraftChange::query()->where('module_id', $moduleB->id)->first();
    expect($change->module_version_id)->toBeNull();
});

// ── publish-time release notes ────────────────────────────────────────────────

test('publishing stores one release note per semantic draft change group', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create(['number' => 'A.1', 'title' => 'Title', 'content' => 'Old.', 'sort_order' => 1]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'number' => 'A.1',
        'title' => 'Title',
        'content' => 'New.',
        'sort_order' => 1,
    ])->assertSuccessful();

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [
        'version_string' => '1.0.0',
        'notes' => 'Release.',
        'expected_draft_revision' => 1,
        'release_notes' => [
            ['entity_type' => 'rule', 'entity_id' => $rule->id, 'note' => 'Clarified the rule.'],
        ],
    ])->assertCreated();

    $versionId = $response->json('data.id');

    expect(ModuleVersionReleaseNote::query()->where('module_version_id', $versionId)->count())->toBe(1);

    $note = ModuleVersionReleaseNote::query()->where('module_version_id', $versionId)->first();

    expect($note->entity_type)->toBe('rule')
        ->and($note->entity_id)->toBe($rule->id)
        ->and($note->note)->toBe('Clarified the rule.');
});

test('publishing exposes release notes on the version resource', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create(['number' => 'A.1', 'title' => 'Title', 'content' => 'Old.', 'sort_order' => 1]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'number' => 'A.1',
        'title' => 'Title',
        'content' => 'New.',
        'sort_order' => 1,
    ])->assertSuccessful();

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [
        'version_string' => '1.0.0',
        'notes' => 'Release.',
        'expected_draft_revision' => 1,
        'release_notes' => [
            ['entity_type' => 'rule', 'entity_id' => $rule->id, 'note' => 'Clarified the rule.'],
        ],
    ])->assertCreated();

    $response->assertJsonPath('data.release_notes.0.entity_type', 'rule')
        ->assertJsonPath('data.release_notes.0.entity_id', $rule->id)
        ->assertJsonPath('data.release_notes.0.note', 'Clarified the rule.');
});

test('a typo-only publish is valid without release notes', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create(['number' => 'A.1', 'title' => 'Title', 'content' => 'Old.', 'sort_order' => 1]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'number' => 'A.1',
        'title' => 'Title',
        'content' => 'New.',
        'sort_order' => 1,
        'classification' => 'typo',
    ])->assertSuccessful();

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [
        'version_string' => '1.0.0',
        'notes' => 'Release.',
        'expected_draft_revision' => 1,
        'release_notes' => [],
    ])->assertCreated();
});

test('publishing rejects release notes that do not cover every semantic group', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create(['number' => 'A.1', 'title' => 'Title', 'content' => 'Old.', 'sort_order' => 1]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'number' => 'A.1',
        'title' => 'Title',
        'content' => 'New.',
        'sort_order' => 1,
    ])->assertSuccessful();

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [
        'version_string' => '1.0.0',
        'notes' => 'Release.',
        'expected_draft_revision' => 1,
        'release_notes' => [],
    ])->assertStatus(422);
});

test('publishing rejects an outdated draft revision without creating a snapshot', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create(['number' => 'A.1', 'title' => 'Title', 'content' => 'Old.', 'sort_order' => 1]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'number' => 'A.1',
        'title' => 'Title',
        'content' => 'New.',
        'sort_order' => 1,
    ])->assertSuccessful();

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [
        'version_string' => '1.0.0',
        'notes' => 'Release.',
        'expected_draft_revision' => 0,
        'release_notes' => [
            ['entity_type' => 'rule', 'entity_id' => $rule->id, 'note' => 'Clarified the rule.'],
        ],
    ])->assertStatus(409);

    expect(ModuleVersion::query()->where('module_id', $module->id)->count())->toBe(0);
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

    expect($response->json('data'))->toHaveCount(2)
        ->and($response->json('draft_revision'))->toBe($module->draft_revision);
    $first = $response->json('data.0');
    expect($first['content_after']['content'])->toBe('First');
});

test('draft changes can be filtered to pending changes', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    $rule = Rule::factory()->for($module)->create();

    ModuleDraftChange::factory()->create([
        'module_id' => $module->id,
        'module_version_id' => $version->id,
        'entity_id' => $rule->id,
        'content_after' => ['content' => 'Published'],
    ]);
    ModuleDraftChange::factory()->create([
        'module_id' => $module->id,
        'module_version_id' => null,
        'entity_id' => $rule->id,
        'content_after' => ['content' => 'Pending'],
    ]);

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/draft-changes?pending=1')
        ->assertSuccessful();

    expect($response->json('data'))->toHaveCount(1)
        ->and($response->json('data.0.content_after.content'))->toBe('Pending');
});

test('draft changes response includes the module draft revision', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create(['draft_revision' => 7]);

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/draft-changes')
        ->assertSuccessful();

    expect($response->json('draft_revision'))->toBe(7);
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

test('module subscriber without editor rights cannot view draft changes', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/draft-changes')
        ->assertForbidden();
});

test('module editor can view draft changes', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();

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

// ── reclassification ──────────────────────────────────────────────────────────

test('a module editor can reclassify a pending draft change', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();
    $rule = Rule::factory()->for($module)->create();

    $change = ModuleDraftChange::factory()->create([
        'module_id' => $module->id,
        'entity_id' => $rule->id,
        'classification' => DraftChangeClassification::Semantic,
    ]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/draft-changes/'.$change->id, [
        'classification' => 'typo',
    ])->assertSuccessful();

    expect($change->refresh()->classification)->toBe(DraftChangeClassification::Typo);
});

test('a system admin can reclassify a pending draft change', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Membership::factory()->for($user)->for($system)->admin()->create();
    $rule = Rule::factory()->for($module)->create();

    $change = ModuleDraftChange::factory()->create([
        'module_id' => $module->id,
        'entity_id' => $rule->id,
        'classification' => DraftChangeClassification::Semantic,
    ]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/draft-changes/'.$change->id, [
        'classification' => 'semantic',
    ])->assertSuccessful();

    expect($change->refresh()->classification)->toBe(DraftChangeClassification::Semantic);
});

test('a module subscriber cannot reclassify a draft change', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();
    $rule = Rule::factory()->for($module)->create();

    $change = ModuleDraftChange::factory()->create([
        'module_id' => $module->id,
        'entity_id' => $rule->id,
    ]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/draft-changes/'.$change->id, [
        'classification' => 'typo',
    ])->assertForbidden();
});

test('reclassify requires a valid classification', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();

    $change = ModuleDraftChange::factory()->create([
        'module_id' => $module->id,
        'entity_id' => $rule->id,
    ]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/draft-changes/'.$change->id, [
        'classification' => 'bogus',
    ])->assertUnprocessable();
});

test('a published draft change cannot be reclassified', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    $rule = Rule::factory()->for($module)->create();

    $change = ModuleDraftChange::factory()->create([
        'module_id' => $module->id,
        'module_version_id' => $version->id,
        'entity_id' => $rule->id,
    ]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/draft-changes/'.$change->id, [
        'classification' => 'typo',
    ])->assertStatus(409);
});

test('a draft change from another module cannot be reclassified through this module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($moduleB)->create();

    $change = ModuleDraftChange::factory()->create([
        'module_id' => $moduleB->id,
        'entity_id' => $rule->id,
    ]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$moduleA->id.'/draft-changes/'.$change->id, [
        'classification' => 'typo',
    ])->assertNotFound();
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
        'classification' => DraftChangeClassification::Semantic,
        'content_before' => ['content' => 'Old'],
        'content_after' => ['content' => 'New'],
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
                'classification',
                'content_before',
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
    $rule = Rule::factory()->for($module)->create(['number' => 'B.1', 'title' => 'T', 'content' => 'V0.', 'sort_order' => 1]);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'number' => 'B.1',
        'title' => 'T',
        'content' => 'Version 1.',
        'sort_order' => 1,
    ])->assertSuccessful();

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'number' => 'B.1',
        'title' => 'T',
        'content' => 'Version 2.',
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

test('release note belongs to its module version', function (): void {
    $version = ModuleVersion::factory()->released()->create();
    $note = ModuleVersionReleaseNote::factory()->create(['module_version_id' => $version->id]);

    expect($note->moduleVersion->id)->toBe($version->id);
});

test('module version has many release notes', function (): void {
    $version = ModuleVersion::factory()->released()->create();
    ModuleVersionReleaseNote::factory()->create(['module_version_id' => $version->id]);
    ModuleVersionReleaseNote::factory()->create(['module_version_id' => $version->id]);
    ModuleVersionReleaseNote::factory()->create(['module_version_id' => $version->id]);

    expect($version->releaseNotes)->toHaveCount(3);
});
