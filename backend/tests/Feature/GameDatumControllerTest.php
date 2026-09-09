<?php

declare(strict_types=1);

use App\Enums\GameDataType;
use App\Models\GameDatum;
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
    $gameDatum = GameDatum::factory()->for($module)->create();
    $url = str_replace(['{system}', '{module}', '{game_datum}'], [$system->id, $module->id, $gameDatum->id], $path);

    $this->$method($url)->assertUnauthorized();
})->with([
    'index' => ['getJson',    '/api/systems/{system}/modules/{module}/game-data'],
    'store' => ['postJson',   '/api/systems/{system}/modules/{module}/game-data'],
    'show' => ['getJson',    '/api/systems/{system}/modules/{module}/game-data/{game_datum}'],
    'update' => ['patchJson',  '/api/systems/{system}/modules/{module}/game-data/{game_datum}'],
    'destroy' => ['deleteJson', '/api/systems/{system}/modules/{module}/game-data/{game_datum}'],
]);

// ── index ────────────────────────────────────────────────────────────────────

test('index returns game data for the module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    GameDatum::factory()->for($module)->count(3)->create();

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data')
        ->assertSuccessful();

    expect($response->json('data'))->toHaveCount(3);
});

test('index does not return game data from other modules', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $other = Module::factory()->for($system)->create();
    GameDatum::factory()->for($other)->count(2)->create();

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data')
        ->assertSuccessful();

    expect($response->json('data'))->toBeEmpty();
});

// ── store ────────────────────────────────────────────────────────────────────

test('store creates a game datum within a module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data', [
        'type' => 'sop',
        'slug' => 'asop',
        'name' => 'Advanced Sequence of Play',
        'content' => ['phases' => []],
    ])->assertCreated();

    $response->assertJsonPath('data.type', 'sop');
    $response->assertJsonPath('data.slug', 'asop');
    $response->assertJsonPath('data.name', 'Advanced Sequence of Play');
    $response->assertJsonPath('data.module_id', $module->id);

    assertDatabaseHas('game_data', ['slug' => 'asop', 'module_id' => $module->id, 'type' => 'sop', 'name' => 'Advanced Sequence of Play']);
});

test('store requires type, slug, and data', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['type', 'slug', 'name', 'content']);
});

test('store rejects invalid type', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data', [
        'type' => 'invalid',
        'slug' => 'test',
        'name' => 'Test',
        'content' => [],
    ])->assertUnprocessable()->assertJsonValidationErrors(['type']);
});

test('store rejects duplicate slug for same type within module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    GameDatum::factory()->for($module)->create(['type' => GameDataType::Sop, 'slug' => 'asop']);

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data', [
        'type' => 'sop',
        'slug' => 'asop',
        'name' => 'ASOP',
        'content' => [],
    ])->assertUnprocessable()->assertJsonValidationErrors(['slug']);
});

test('store allows same slug for different types within module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    GameDatum::factory()->for($module)->create(['type' => GameDataType::Sop, 'slug' => 'main']);

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data', [
        'type' => 'vehicle',
        'slug' => 'main',
        'name' => 'PzKpfw IB',
        'content' => ['name' => 'PzKpfw IB'],
    ])->assertCreated();
});

// ── show ─────────────────────────────────────────────────────────────────────

test('show returns a single game datum', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $gameDatum = GameDatum::factory()->for($module)->create();

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data/'.$gameDatum->id)
        ->assertSuccessful();

    $response->assertJsonPath('data.id', $gameDatum->id);
});

test('show returns 404 for game datum belonging to a different module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $other = Module::factory()->for($system)->create();
    $gameDatum = GameDatum::factory()->for($other)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data/'.$gameDatum->id)
        ->assertNotFound();
});

// ── update ───────────────────────────────────────────────────────────────────

test('update modifies a game datum', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $gameDatum = GameDatum::factory()->for($module)->create(['type' => GameDataType::Sop, 'slug' => 'asop']);

    actingAs($user);

    $response = patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data/'.$gameDatum->id, [
        'content' => ['phases' => ['rally']],
    ])->assertSuccessful();

    $response->assertJsonPath('data.content.phases.0', 'rally');
    assertDatabaseHas('game_data', ['id' => $gameDatum->id]);
});

test('update returns 404 for game datum belonging to a different module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $other = Module::factory()->for($system)->create();
    $gameDatum = GameDatum::factory()->for($other)->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data/'.$gameDatum->id, ['content' => []])
        ->assertNotFound();
});

test('changing the final SOP datum type clears selected SOP modules', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $gameDatum = GameDatum::factory()->for($module)->create(['type' => GameDataType::Sop]);
    $member = User::factory()->create();
    $membership = Membership::factory()->for($member)->for($system)->create([
        'config' => ['selected_sop_module_id' => $module->id],
    ]);
    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data/'.$gameDatum->id, [
        'type' => 'table',
    ])->assertSuccessful();

    expect($membership->fresh()?->config?->selectedSopModuleId)->toBeNull();
});

// ── destroy ──────────────────────────────────────────────────────────────────

test('destroy deletes a game datum', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $gameDatum = GameDatum::factory()->for($module)->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data/'.$gameDatum->id)
        ->assertNoContent();

    assertDatabaseMissing('game_data', ['id' => $gameDatum->id]);
});

test('deleting the final SOP datum clears selected SOP modules', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $gameDatum = GameDatum::factory()->for($module)->create(['type' => GameDataType::Sop]);
    $member = User::factory()->create();
    $membership = Membership::factory()->for($member)->for($system)->create([
        'config' => ['selected_sop_module_id' => $module->id],
    ]);
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data/'.$gameDatum->id)
        ->assertNoContent();

    expect($membership->fresh()?->config?->selectedSopModuleId)->toBeNull();
});

test('deleting an SOP datum preserves a membership that selected a different module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    $gameDatum = GameDatum::factory()->for($moduleA)->create(['type' => GameDataType::Sop]);
    $member = User::factory()->create();
    $membership = Membership::factory()->for($member)->for($system)->create([
        'config' => ['selected_sop_module_id' => $moduleB->id],
    ]);
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$moduleA->id.'/game-data/'.$gameDatum->id)
        ->assertNoContent();

    expect($membership->fresh()?->config?->selectedSopModuleId)->toBe($moduleB->id);
});

test('destroy returns 404 for game datum belonging to a different module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $other = Module::factory()->for($system)->create();
    $gameDatum = GameDatum::factory()->for($other)->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data/'.$gameDatum->id)
        ->assertNotFound();
});

// ── authorization ────────────────────────────────────────────────────────────

test('regular user cannot list game data', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data')
        ->assertForbidden();
});

test('regular user cannot create a game datum', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data', ['type' => 'sop', 'slug' => 'asop', 'name' => 'ASOP', 'content' => ['phases' => []]])
        ->assertForbidden();
});

test('regular user cannot update a game datum', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $gameDatum = GameDatum::factory()->for($module)->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data/'.$gameDatum->id, ['content' => []])
        ->assertForbidden();
});

test('regular user cannot delete a game datum', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $gameDatum = GameDatum::factory()->for($module)->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data/'.$gameDatum->id)
        ->assertForbidden();
});

test('module subscriber can list game data', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data')
        ->assertSuccessful();
});

test('module subscriber cannot create a game datum', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data', ['type' => 'sop', 'slug' => 'asop', 'name' => 'ASOP', 'content' => ['phases' => []]])
        ->assertForbidden();
});

test('module editor can create a game datum', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data', ['type' => 'vehicle', 'slug' => 'pzib', 'name' => 'PzKpfw IB', 'content' => ['name' => 'PzKpfw IB']])
        ->assertCreated();
});

test('module editor cannot create a game datum in another module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($moduleA)->editor()->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$moduleB->id.'/game-data', ['type' => 'vehicle', 'slug' => 'pzib', 'name' => 'PzKpfw IB', 'content' => ['name' => 'PzKpfw IB']])
        ->assertForbidden();
});

test('system admin can create a game datum', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Membership::factory()->for($user)->for($system)->admin()->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data', ['type' => 'table', 'slug' => 'ift', 'name' => 'Infantry Fire Table', 'content' => ['rows' => []]])
        ->assertCreated();
});

test('module subscriber can view a single game datum', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $gameDatum = GameDatum::factory()->for($module)->create();
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data/'.$gameDatum->id)
        ->assertSuccessful()
        ->assertJsonPath('data.id', $gameDatum->id);
});

test('system admin can view a single game datum', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $gameDatum = GameDatum::factory()->for($module)->create();
    Membership::factory()->for($user)->for($system)->admin()->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data/'.$gameDatum->id)
        ->assertSuccessful()
        ->assertJsonPath('data.id', $gameDatum->id);
});

test('module editor can update a game datum', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $gameDatum = GameDatum::factory()->for($module)->create(['type' => GameDataType::Sop, 'slug' => 'asop-editor']);
    Subscription::factory()->for($user)->for($module)->editor()->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data/'.$gameDatum->id, ['content' => ['updated' => true]])
        ->assertSuccessful();
});

test('module editor can delete a game datum', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $gameDatum = GameDatum::factory()->for($module)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/game-data/'.$gameDatum->id)
        ->assertNoContent();

    assertDatabaseMissing('game_data', ['id' => $gameDatum->id]);
});
