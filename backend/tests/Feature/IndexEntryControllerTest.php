<?php

declare(strict_types=1);

use App\Models\IndexEntry;
use App\Models\Membership;
use App\Models\Module;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertDatabaseMissing;
use function Pest\Laravel\deleteJson;
use function Pest\Laravel\getJson;
use function Pest\Laravel\patchJson;
use function Pest\Laravel\postJson;

// ── Unauthenticated ──────────────────────────────────────────────────────────

test('unauthenticated requests are rejected', function (string $method, string $path): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();
    $url = str_replace(['{system}', '{module}', '{indexEntry}'], [$system->id, $module->id, $entry->id], $path);

    $this->$method($url)->assertUnauthorized();
})->with([
    'index' => ['getJson',    '/api/systems/{system}/modules/{module}/index-entries'],
    'store' => ['postJson',   '/api/systems/{system}/modules/{module}/index-entries'],
    'show' => ['getJson',    '/api/systems/{system}/modules/{module}/index-entries/{indexEntry}'],
    'update' => ['patchJson',  '/api/systems/{system}/modules/{module}/index-entries/{indexEntry}'],
    'destroy' => ['deleteJson', '/api/systems/{system}/modules/{module}/index-entries/{indexEntry}'],
]);

// ── index ────────────────────────────────────────────────────────────────────

test('index returns index entries for the module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    IndexEntry::factory()->for($module)->count(3)->create();

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries')
        ->assertSuccessful();

    expect($response->json('data'))->toHaveCount(3);
});

test('index returns index entries ordered by term', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    IndexEntry::factory()->for($module)->create(['term' => 'Charlie']);
    IndexEntry::factory()->for($module)->create(['term' => 'Alpha']);
    IndexEntry::factory()->for($module)->create(['term' => 'Bravo']);

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries')
        ->assertSuccessful();

    $terms = collect($response->json('data'))->pluck('term')->all();
    expect($terms)->toBe(['Alpha', 'Bravo', 'Charlie']);
});

test('index does not return index entries from other modules', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $other = Module::factory()->for($system)->create();
    IndexEntry::factory()->for($other)->count(2)->create();

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries')
        ->assertSuccessful();

    expect($response->json('data'))->toBeEmpty();
});

// ── store ────────────────────────────────────────────────────────────────────

test('store creates an index entry within a module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    $payload = [
        'term' => 'Ambush',
        'definition' => 'A surprise attack.',
        'notes' => 'See also: Flanking.',
        'relations' => ['rule_refs' => [], 'see_also' => []],
    ];

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries', $payload)
        ->assertCreated();

    $response->assertJsonPath('data.term', 'Ambush');
    $response->assertJsonPath('data.definition', 'A surprise attack.');
    $response->assertJsonPath('data.module_id', $module->id);

    assertDatabaseHas('index_entries', ['term' => 'Ambush', 'module_id' => $module->id]);
});

test('store requires term', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['term']);
});

test('store rejects duplicate term within the same module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    IndexEntry::factory()->for($module)->create(['term' => 'Duplicate']);

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries', ['term' => 'Duplicate'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['term']);
});

test('store accepts rule_refs and see_also as arrays', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries', [
        'term' => 'Concept',
        'definition' => 'A core concept.',
        'notes' => 'Related concepts apply.',
        'relations' => ['rule_refs' => ['A.1', 'B.2'], 'see_also' => ['Other Term']],
    ])->assertCreated();

    $response->assertJsonPath('data.relations.rule_refs', ['A.1', 'B.2']);
    $response->assertJsonPath('data.relations.see_also', ['Other Term']);
});

test('store rejects invalid parent_id from a different module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $other = Module::factory()->for($system)->create();
    $foreignParent = IndexEntry::factory()->for($other)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries', [
        'term' => 'Child',
        'parent_id' => $foreignParent->id,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['parent_id']);
});

test('store accepts valid parent_id within the same module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $parent = IndexEntry::factory()->for($module)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries', [
        'term' => 'Child Entry',
        'parent_id' => $parent->id,
        'definition' => 'A child entry.',
        'notes' => 'Inherits from parent.',
        'relations' => ['rule_refs' => [], 'see_also' => []],
    ])
        ->assertCreated()
        ->assertJsonPath('data.parent_id', $parent->id);
});

// ── show ─────────────────────────────────────────────────────────────────────

test('show returns a single index entry', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id)
        ->assertSuccessful();

    $response->assertJsonPath('data.id', $entry->id);
    $response->assertJsonPath('data.module_id', $module->id);
});

test('show returns 404 for index entry belonging to a different module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $other = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($other)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id)
        ->assertNotFound();
});

// ── update ───────────────────────────────────────────────────────────────────

test('update modifies an index entry', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();

    actingAs($user);

    $response = patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id, [
        'parent_id' => $entry->parent_id,
        'term' => 'Updated Term',
        'definition' => $entry->definition,
        'notes' => $entry->notes,
        'relations' => ['rule_refs' => $entry->relations['rule_refs'] ?? [], 'see_also' => $entry->relations['see_also'] ?? []],
    ])
        ->assertSuccessful();

    $response->assertJsonPath('data.term', 'Updated Term');
    assertDatabaseHas('index_entries', ['id' => $entry->id, 'term' => 'Updated Term']);
});

test('update succeeds when keeping the same term', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create(['term' => 'Alpha']);

    actingAs($user);

    $response = patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id, [
        'parent_id' => $entry->parent_id,
        'term' => 'Alpha',
        'definition' => $entry->definition,
        'notes' => $entry->notes,
        'relations' => ['rule_refs' => $entry->relations['rule_refs'] ?? [], 'see_also' => $entry->relations['see_also'] ?? []],
    ])
        ->assertSuccessful();

    $response->assertJsonPath('data.term', 'Alpha');
    assertDatabaseHas('index_entries', ['id' => $entry->id, 'term' => 'Alpha']);
});

test('update returns 404 for index entry belonging to a different module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $other = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($other)->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id, ['term' => 'Hacked'])
        ->assertNotFound();
});

// ── destroy ───────────────────────────────────────────────────────────────────

test('destroy deletes an index entry', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id)
        ->assertNoContent();

    assertDatabaseMissing('index_entries', ['id' => $entry->id]);
});

test('destroy returns 404 for index entry belonging to a different module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $other = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($other)->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id)
        ->assertNotFound();
});

// ── authorization ─────────────────────────────────────────────────────────────

test('regular user cannot list index entries', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries')
        ->assertForbidden();
});

test('regular user cannot view an index entry', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id)
        ->assertForbidden();
});

test('regular user cannot create an index entry', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries', ['term' => 'Test', 'definition' => 'Def.', 'notes' => 'Notes.', 'relations' => ['rule_refs' => [], 'see_also' => []]])
        ->assertForbidden();
});

test('regular user cannot update an index entry', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id, [
        'parent_id' => $entry->parent_id,
        'term' => 'Hacked',
        'definition' => $entry->definition,
        'notes' => $entry->notes,
        'relations' => ['rule_refs' => $entry->relations['rule_refs'] ?? [], 'see_also' => $entry->relations['see_also'] ?? []],
    ])
        ->assertForbidden();
});

test('regular user cannot delete an index entry', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id)
        ->assertForbidden();
});

// ── module subscriber authorization ──────────────────────────────────────────

test('module subscriber can list index entries', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries')
        ->assertSuccessful();
});

test('module subscriber can view an index entry', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id)
        ->assertSuccessful();
});

test('module subscriber cannot create an index entry', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries', ['term' => 'Test', 'definition' => 'Def.', 'notes' => 'Notes.', 'relations' => ['rule_refs' => [], 'see_also' => []]])
        ->assertForbidden();
});

test('module subscriber cannot update an index entry', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id, [
        'parent_id' => $entry->parent_id,
        'term' => 'Hacked',
        'definition' => $entry->definition,
        'notes' => $entry->notes,
        'relations' => ['rule_refs' => $entry->relations['rule_refs'] ?? [], 'see_also' => $entry->relations['see_also'] ?? []],
    ])
        ->assertForbidden();
});

test('module subscriber cannot delete an index entry', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id)
        ->assertForbidden();
});

// ── module editor authorization ──────────────────────────────────────────────

test('module editor can create an index entry in their module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries', ['term' => 'Editor Term', 'definition' => 'Editor definition.', 'notes' => 'Editor notes.', 'relations' => ['rule_refs' => [], 'see_also' => []]])
        ->assertCreated();
});

test('module editor of module A cannot create an index entry in module B', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($moduleA)->editor()->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$moduleB->id.'/index-entries', ['term' => 'Editor Term', 'definition' => 'Def.', 'notes' => 'Notes.', 'relations' => ['rule_refs' => [], 'see_also' => []]])
        ->assertForbidden();
});

test('module editor can update an index entry in their module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id, [
        'parent_id' => $entry->parent_id,
        'term' => 'Editor Updated',
        'definition' => $entry->definition,
        'notes' => $entry->notes,
        'relations' => ['rule_refs' => $entry->relations['rule_refs'] ?? [], 'see_also' => $entry->relations['see_also'] ?? []],
    ])
        ->assertSuccessful();
});

test('module editor cannot update an index entry in another module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($moduleB)->create();
    Subscription::factory()->for($user)->for($moduleA)->editor()->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$moduleB->id.'/index-entries/'.$entry->id, [
        'parent_id' => $entry->parent_id,
        'term' => 'Hacked',
        'definition' => $entry->definition,
        'notes' => $entry->notes,
        'relations' => ['rule_refs' => $entry->relations['rule_refs'] ?? [], 'see_also' => $entry->relations['see_also'] ?? []],
    ])
        ->assertForbidden();
});

test('module editor can delete an index entry in their module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id)
        ->assertNoContent();
});

test('module editor cannot delete an index entry in another module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($moduleB)->create();
    Subscription::factory()->for($user)->for($moduleA)->editor()->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$moduleB->id.'/index-entries/'.$entry->id)
        ->assertForbidden();
});

// ── system admin authorization ───────────────────────────────────────────────

test('system admin can create an index entry', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Membership::factory()->for($user)->for($system)->admin()->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries', ['term' => 'Admin Term', 'definition' => 'Admin definition.', 'notes' => 'Admin notes.', 'relations' => ['rule_refs' => [], 'see_also' => []]])
        ->assertCreated();
});

test('system admin can update an index entry', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();
    Membership::factory()->for($user)->for($system)->admin()->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id, [
        'parent_id' => $entry->parent_id,
        'term' => 'Admin Updated',
        'definition' => $entry->definition,
        'notes' => $entry->notes,
        'relations' => ['rule_refs' => $entry->relations['rule_refs'] ?? [], 'see_also' => $entry->relations['see_also'] ?? []],
    ])
        ->assertSuccessful();
});

test('system admin can delete an index entry', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();
    Membership::factory()->for($user)->for($system)->admin()->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id)
        ->assertNoContent();
});
