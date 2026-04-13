<?php

declare(strict_types=1);

use App\Models\IndexEntry;
use App\Models\IndexEntryVersion;
use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\Rule;
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

// ── Unauthenticated ──────────────────────────────────────────────────────────

test('unauthenticated requests are rejected', function (string $method, string $path): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();
    $url = str_replace(['{system}', '{module}', '{version}'], [$system->id, $module->id, $version->id], $path);

    $this->$method($url)->assertUnauthorized();
})->with([
    'index' => ['getJson',  '/api/systems/{system}/modules/{module}/versions'],
    'store' => ['postJson', '/api/systems/{system}/modules/{module}/versions'],
    'show' => ['getJson',  '/api/systems/{system}/modules/{module}/versions/{version}'],
]);

// ── show ─────────────────────────────────────────────────────────────────────

test('show returns the specified version', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($module)->released()->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions/'.$version->id)
        ->assertSuccessful()
        ->assertJsonPath('version.id', $version->id)
        ->assertJsonPath('version.version_string', $version->version_string);
});

test('show returns 404 for version belonging to a different module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    $version = ModuleVersion::factory()->for($moduleB)->released()->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$moduleA->id.'/versions/'.$version->id)
        ->assertNotFound();
});

// ── index ────────────────────────────────────────────────────────────────────

test('index returns released versions for the module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    ModuleVersion::factory()->for($module)->released()->count(3)->create();

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions')
        ->assertSuccessful();

    expect($response->json('data'))->toHaveCount(3);
});

test('index does not return unreleased versions', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    ModuleVersion::factory()->for($module)->create(['released_at' => null]);

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions')
        ->assertSuccessful();

    expect($response->json('data'))->toBeEmpty();
});

test('index returns versions ordered by latest released_at first', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    ModuleVersion::factory()->for($module)->released()->create(['version_string' => 'v1.0.0', 'released_at' => now()->subDays(2)]);
    ModuleVersion::factory()->for($module)->released()->create(['version_string' => 'v3.0.0', 'released_at' => now()]);
    ModuleVersion::factory()->for($module)->released()->create(['version_string' => 'v2.0.0', 'released_at' => now()->subDay()]);

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions')
        ->assertSuccessful();

    $versions = collect($response->json('data'))->pluck('version_string')->all();
    expect($versions)->toBe(['v3.0.0', 'v2.0.0', 'v1.0.0']);
});

test('index does not return versions from other modules', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $other = Module::factory()->for($system)->create();
    ModuleVersion::factory()->for($other)->released()->count(2)->create();

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions')
        ->assertSuccessful();

    expect($response->json('data'))->toBeEmpty();
});

// ── store ────────────────────────────────────────────────────────────────────

test('store publishes a new version', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();

    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [
        'version_string' => 'v1.0.0',
        'notes' => 'Initial release',
    ])->assertCreated();

    $response->assertJsonPath('data.version_string', 'v1.0.0');
    $response->assertJsonPath('data.notes', 'Initial release');
    $response->assertJsonPath('data.module_id', $module->id);
    $response->assertJsonPath('data.released_by', $user->id);

    expect($response->json('data.released_at'))->not->toBeNull();
});

test('store snapshots rules including parent-child relationships', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();
    $parent = Rule::factory()->for($module)->create(['number' => '1', 'sort_order' => 1]);
    $child = Rule::factory()->for($module)->create(['number' => '1.1', 'sort_order' => 2, 'parent_id' => $parent->id]);

    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [
        'version_string' => 'v1.0.0',
    ])->assertCreated();

    $versionId = $response->json('data.id');

    $parentSnapshot = RuleVersion::query()
        ->where('module_version_id', $versionId)
        ->where('rule_id', $parent->id)
        ->first();

    $childSnapshot = RuleVersion::query()
        ->where('module_version_id', $versionId)
        ->where('rule_id', $child->id)
        ->first();

    expect($parentSnapshot)->not->toBeNull()
        ->and($parentSnapshot->number)->toBe('1')
        ->and($parentSnapshot->parent_id)->toBeNull()
        ->and($childSnapshot)->not->toBeNull()
        ->and($childSnapshot->number)->toBe('1.1')
        ->and($childSnapshot->parent_id)->toBe($parentSnapshot->id);
});

test('store snapshots index entries including parent-child relationships', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();
    $parent = IndexEntry::factory()->for($module)->create(['term' => 'Alpha']);
    $child = IndexEntry::factory()->for($module)->create(['term' => 'Alpha sub', 'parent_id' => $parent->id]);

    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [
        'version_string' => 'v1.0.0',
    ])->assertCreated();

    $versionId = $response->json('data.id');

    $parentSnapshot = IndexEntryVersion::query()
        ->where('module_version_id', $versionId)
        ->where('index_entry_id', $parent->id)
        ->first();

    $childSnapshot = IndexEntryVersion::query()
        ->where('module_version_id', $versionId)
        ->where('index_entry_id', $child->id)
        ->first();

    expect($parentSnapshot)->not->toBeNull()
        ->and($parentSnapshot->term)->toBe('Alpha')
        ->and($parentSnapshot->parent_id)->toBeNull()
        ->and($childSnapshot)->not->toBeNull()
        ->and($childSnapshot->term)->toBe('Alpha sub')
        ->and($childSnapshot->parent_id)->toBe($parentSnapshot->id);
});

test('store requires version_string', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['version_string']);
});

test('store rejects duplicate version_string within the same module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    ModuleVersion::factory()->for($module)->released()->create(['version_string' => 'v1.0.0']);

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [
        'version_string' => 'v1.0.0',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['version_string']);
});

test('store allows same version_string in a different module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($moduleA)->editor()->create();
    ModuleVersion::factory()->for($moduleB)->released()->create(['version_string' => 'v1.0.0']);

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$moduleA->id.'/versions', [
        'version_string' => 'v1.0.0',
    ])->assertCreated();
});

// ── Authorization ─────────────────────────────────────────────────────────────

test('regular user cannot publish a version', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [
        'version_string' => 'v1.0.0',
    ])->assertForbidden();
});

test('system admin can publish a version', function (): void {
    $admin = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $system->memberships()->create(['user_id' => $admin->id, 'admin' => true]);

    actingAs($admin);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [
        'version_string' => 'v1.0.0',
    ])->assertCreated();
});

test('super_admin can publish a version', function (): void {
    $superAdmin = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($superAdmin);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [
        'version_string' => 'v1.0.0',
    ])->assertCreated();
});

// ── static file generation ────────────────────────────────────────────────────

test('publishing a version generates static rules file', function (): void {
    Storage::fake('local');

    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Rule::factory()->for($module)->create(['number' => '1.0', 'sort_order' => 1]);

    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [
        'version_string' => '1.0',
    ])->assertCreated();

    $versionId = $response->json('data.id');

    Storage::disk('local')->assertExists(sprintf('versions/%s/rules.json', $versionId));

    $contents = Storage::disk('local')->get(sprintf('versions/%s/rules.json', $versionId));
    $decoded = json_decode((string) $contents, true);

    expect($decoded)->toBeArray()->not->toBeEmpty()
        ->and($decoded[0])->toHaveKeys(['id', 'rule_id', 'module_version_id', 'parent_id', 'number', 'title', 'content', 'sort_order']);
});

test('publishing a version generates static index file', function (): void {
    Storage::fake('local');

    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    IndexEntry::factory()->for($module)->create(['term' => 'Alpha']);

    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/versions', [
        'version_string' => '1.0',
    ])->assertCreated();

    $versionId = $response->json('data.id');

    Storage::disk('local')->assertExists(sprintf('versions/%s/index.json', $versionId));

    $contents = Storage::disk('local')->get(sprintf('versions/%s/index.json', $versionId));
    $decoded = json_decode((string) $contents, true);

    expect($decoded)->toBeArray()->not->toBeEmpty()
        ->and($decoded[0])->toHaveKeys(['id', 'index_entry_id', 'module_version_id', 'parent_id', 'term', 'definition', 'notes', 'relations']);
});
