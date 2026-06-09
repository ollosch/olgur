<?php

declare(strict_types=1);

use App\Models\GameDatumVersion;
use App\Models\IndexEntryVersion;
use App\Models\Membership;
use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\ModuleVersionAmendment;
use App\Models\RuleVersion;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;

beforeEach(function (): void {
    Storage::fake('local');
});

// ── helpers ───────────────────────────────────────────────────────────────────

function amendmentUrl(System $system, Module $module, ModuleVersion $version): string
{
    return sprintf(
        '/api/systems/%s/modules/%s/versions/%s/amendments',
        $system->id,
        $module->id,
        $version->id,
    );
}

// ── Unauthenticated ──────────────────────────────────────────────────────────

test('amendments: unauthenticated requests are rejected', function (string $method): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    $url = amendmentUrl($system, $module, $version);
    $this->$method($url)->assertUnauthorized();
})->with([
    'index' => ['getJson'],
    'store' => ['postJson'],
]);

// ── store: happy path ─────────────────────────────────────────────────────────

test('store applies a rule amendment and increments revision', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    $ruleVersion = RuleVersion::factory()->create([
        'module_version_id' => $version->id,
        'content' => 'Original content.',
    ]);

    actingAs($user);

    $response = postJson(amendmentUrl($system, $module, $version), [
        'entity_type' => 'rule',
        'entity_id' => $ruleVersion->id,
        'change_type' => 'correction',
        'description' => 'Fixed a typo.',
        'content' => ['content' => 'Corrected content.'],
    ])->assertSuccessful();

    $response->assertJsonPath('data.entity_type', 'rule');
    $response->assertJsonPath('data.change_type', 'correction');
    $response->assertJsonPath('data.description', 'Fixed a typo.');
    $response->assertJsonPath('data.content_after.content', 'Corrected content.');
    $response->assertJsonPath('data.amended_by', $user->id);

    expect($ruleVersion->fresh()->content)->toBe('Corrected content.');
    expect($version->fresh()->revision)->toBe(1);
    expect(ModuleVersionAmendment::query()->where('module_version_id', $version->id)->count())->toBe(1);
});

test('store applies an index entry amendment', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    $indexEntryVersion = IndexEntryVersion::factory()->create([
        'module_version_id' => $version->id,
        'definition' => 'Old definition.',
        'notes' => 'Old notes.',
        'relations' => [],
    ]);

    actingAs($user);

    postJson(amendmentUrl($system, $module, $version), [
        'entity_type' => 'index_entry',
        'entity_id' => $indexEntryVersion->id,
        'change_type' => 'update',
        'description' => 'Updated definition.',
        'content' => ['definition' => 'New definition.', 'notes' => 'New notes.', 'relations' => []],
    ])->assertSuccessful();

    expect($indexEntryVersion->fresh()->definition)->toBe('New definition.');
    expect($version->fresh()->revision)->toBe(1);
});

test('store applies a game datum amendment', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    $gameDatumVersion = GameDatumVersion::factory()->create([
        'module_version_id' => $version->id,
        'content' => ['old' => true],
    ]);

    actingAs($user);

    postJson(amendmentUrl($system, $module, $version), [
        'entity_type' => 'game_datum',
        'entity_id' => $gameDatumVersion->id,
        'change_type' => 'update',
        'description' => 'Updated content.',
        'content' => ['content' => ['new' => true]],
    ])->assertSuccessful();

    expect($gameDatumVersion->fresh()->content)->toBe(['new' => true]);
    expect($version->fresh()->revision)->toBe(1);
});

test('store regenerates the static rules file after amendment', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    $ruleVersion = RuleVersion::factory()->create([
        'module_version_id' => $version->id,
        'content' => 'Original.',
    ]);

    actingAs($user);

    postJson(amendmentUrl($system, $module, $version), [
        'entity_type' => 'rule',
        'entity_id' => $ruleVersion->id,
        'change_type' => 'correction',
        'description' => 'Fix.',
        'content' => ['content' => 'Fixed.'],
    ])->assertSuccessful();

    Storage::disk('local')->assertExists(sprintf('versions/%s/rules.json', $version->id));
    $decoded = json_decode((string) Storage::disk('local')->get(sprintf('versions/%s/rules.json', $version->id)), true);
    expect($decoded[0]['content'])->toBe('Fixed.');
});

// ── store: validation ─────────────────────────────────────────────────────────

test('store returns 422 for invalid entity_type', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    actingAs($user);

    postJson(amendmentUrl($system, $module, $version), [
        'entity_type' => 'invalid_type',
        'entity_id' => 'some-id',
        'change_type' => 'correction',
        'description' => 'Fix.',
        'content' => ['content' => 'Fixed.'],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['entity_type']);
});

test('store returns 422 when required fields are missing', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    actingAs($user);

    postJson(amendmentUrl($system, $module, $version), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['entity_type', 'entity_id', 'change_type', 'description', 'content']);
});

test('store returns 404 for invalid entity_id not belonging to version', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    actingAs($user);

    postJson(amendmentUrl($system, $module, $version), [
        'entity_type' => 'rule',
        'entity_id' => 'nonexistent-id',
        'change_type' => 'correction',
        'description' => 'Fix.',
        'content' => ['content' => 'Fixed.'],
    ])->assertNotFound();
});

// ── store: authorization ──────────────────────────────────────────────────────

test('regular user cannot apply an amendment', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    actingAs($user);

    postJson(amendmentUrl($system, $module, $version), [
        'entity_type' => 'rule',
        'entity_id' => 'any-id',
        'change_type' => 'correction',
        'description' => 'Fix.',
        'content' => ['content' => 'Fixed.'],
    ])->assertForbidden();
});

test('module subscriber cannot apply an amendment', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    postJson(amendmentUrl($system, $module, $version), [
        'entity_type' => 'rule',
        'entity_id' => 'any-id',
        'change_type' => 'correction',
        'description' => 'Fix.',
        'content' => ['content' => 'Fixed.'],
    ])->assertForbidden();
});

test('module editor can apply an amendment', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();
    $ruleVersion = RuleVersion::factory()->create(['module_version_id' => $version->id]);

    actingAs($user);

    postJson(amendmentUrl($system, $module, $version), [
        'entity_type' => 'rule',
        'entity_id' => $ruleVersion->id,
        'change_type' => 'correction',
        'description' => 'Fix.',
        'content' => ['content' => 'Fixed.'],
    ])->assertSuccessful();
});

test('system admin can apply an amendment', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    Membership::factory()->for($user)->for($system)->admin()->create();
    $ruleVersion = RuleVersion::factory()->create(['module_version_id' => $version->id]);

    actingAs($user);

    postJson(amendmentUrl($system, $module, $version), [
        'entity_type' => 'rule',
        'entity_id' => $ruleVersion->id,
        'change_type' => 'correction',
        'description' => 'Fix.',
        'content' => ['content' => 'Fixed.'],
    ])->assertSuccessful();
});

// ── index ─────────────────────────────────────────────────────────────────────

test('index returns amendments ordered by amended_at ascending', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    $ruleVersion = RuleVersion::factory()->create(['module_version_id' => $version->id]);

    ModuleVersionAmendment::factory()->create([
        'module_version_id' => $version->id,
        'entity_id' => $ruleVersion->id,
        'description' => 'First',
        'amended_at' => now()->subHour(),
    ]);
    ModuleVersionAmendment::factory()->create([
        'module_version_id' => $version->id,
        'entity_id' => $ruleVersion->id,
        'description' => 'Second',
        'amended_at' => now(),
    ]);

    actingAs($user);

    $response = getJson(amendmentUrl($system, $module, $version))
        ->assertSuccessful();

    $descriptions = collect($response->json('data'))->pluck('description')->all();
    expect($descriptions)->toBe(['First', 'Second']);
});

test('index only returns amendments for the given version', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $versionA = ModuleVersion::factory()->for($module)->released()->create();
    $versionB = ModuleVersion::factory()->for($module)->released()->create();
    $ruleVersion = RuleVersion::factory()->create(['module_version_id' => $versionA->id]);

    ModuleVersionAmendment::factory()->create([
        'module_version_id' => $versionA->id,
        'entity_id' => $ruleVersion->id,
    ]);
    ModuleVersionAmendment::factory()->create([
        'module_version_id' => $versionB->id,
    ]);

    actingAs($user);

    $response = getJson(amendmentUrl($system, $module, $versionA))
        ->assertSuccessful();

    expect($response->json('data'))->toHaveCount(1);
});

// ── model relationships ───────────────────────────────────────────────────────

test('amendment belongs to a module version', function (): void {
    $version = ModuleVersion::factory()->released()->create();
    $amendment = ModuleVersionAmendment::factory()->create(['module_version_id' => $version->id]);

    expect($amendment->moduleVersion->id)->toBe($version->id);
});

test('amendment belongs to the user who amended it', function (): void {
    $user = User::factory()->create();
    $amendment = ModuleVersionAmendment::factory()->create(['amended_by' => $user->id]);

    expect($amendment->amendedBy->id)->toBe($user->id);
});
