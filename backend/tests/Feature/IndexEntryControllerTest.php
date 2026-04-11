<?php

declare(strict_types=1);

use App\Models\IndexEntry;
use App\Models\Module;
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
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    IndexEntry::factory()->for($module)->count(3)->create();

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries')
        ->assertSuccessful();

    expect($response->json('data'))->toHaveCount(3);
});

test('index returns index entries ordered by term', function (): void {
    $user = User::factory()->create();
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
    $user = User::factory()->create();
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

test('store accepts rule_refs and see_also as arrays', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries', [
        'term' => 'Concept',
        'relations' => ['rule_refs' => ['A.1', 'B.2'], 'see_also' => ['Other Term']]
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
    ])
        ->assertCreated()
        ->assertJsonPath('data.parent_id', $parent->id);
});

// ── show ─────────────────────────────────────────────────────────────────────

test('show returns a single index entry', function (): void {
    $user = User::factory()->create();
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
    $user = User::factory()->create();
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

    $response = patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id, ['term' => 'Updated Term'])
        ->assertSuccessful();

    $response->assertJsonPath('data.term', 'Updated Term');
    assertDatabaseHas('index_entries', ['id' => $entry->id, 'term' => 'Updated Term']);
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

test('regular user cannot create an index entry', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries', ['term' => 'Test'])
        ->assertForbidden();
});

test('regular user cannot update an index entry', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id, ['term' => 'Hacked'])
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

test('super_admin can create an index entry', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries', ['term' => 'New Entry'])
        ->assertCreated();
});

test('super_admin can update an index entry', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id, ['term' => 'Updated'])
        ->assertSuccessful();
});

test('super_admin can delete an index entry', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $entry = IndexEntry::factory()->for($module)->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/index-entries/'.$entry->id)
        ->assertNoContent();
});
