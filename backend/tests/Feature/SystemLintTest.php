<?php

declare(strict_types=1);

use App\Models\IndexEntry;
use App\Models\Membership;
use App\Models\Module;
use App\Models\Rule;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;

function lintUrl(System $system): string
{
    return '/api/systems/'.$system->id.'/lint';
}

// ── happy path ────────────────────────────────────────────────────────────────

test('lint returns an empty list for a clean system', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->create(['slug' => 'core', 'is_core' => true]);
    Rule::factory()->for($core)->create(['number' => '1.1', 'content' => 'See {{L:1.2}}.']);
    Rule::factory()->for($core)->create(['number' => '1.2', 'content' => 'See {{L:1.1}}.', 'sort_order' => 1]);
    IndexEntry::factory()->for($core)->create(['term' => 'Alpha', 'relations' => ['rule_refs' => ['1.1']]]);

    actingAs($user);

    getJson(lintUrl($system))
        ->assertSuccessful()
        ->assertJson(['data' => []]);
});

test('lint reports dangling rule tokens and index rule refs', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->create(['slug' => 'core', 'is_core' => true]);
    Rule::factory()->for($core)->create(['number' => '1.1', 'content' => 'See {{L:9.9}} and {{L:missing:1.1}}.']);
    IndexEntry::factory()->for($core)->create(['term' => 'Alpha', 'relations' => ['rule_refs' => ['8.8']]]);

    actingAs($user);

    getJson(lintUrl($system))
        ->assertSuccessful()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.module', 'core')
        ->assertJsonPath('data.0.location', '1.1')
        ->assertJsonPath('data.0.kind', 'rule')
        ->assertJsonPath('data.0.reference', '{{L:9.9}}')
        ->assertJsonPath('data.0.reason', 'unknown_number')
        ->assertJsonPath('data.1.reason', 'unknown_slug')
        ->assertJsonPath('data.2.kind', 'index')
        ->assertJsonPath('data.2.location', 'Alpha')
        ->assertJsonPath('data.2.reason', 'unknown_number');
});

test('lint resolves bare tokens system-wide when rule numbers are global', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->withGlobalRuleNumbers()->create();
    $core = Module::factory()->for($system)->create(['slug' => 'core', 'is_core' => true]);
    $expansion = Module::factory()->for($system)->create(['slug' => 'expansion']);
    Rule::factory()->for($core)->create(['number' => '1.1', 'content' => 'Core.']);
    Rule::factory()->for($expansion)->create(['number' => '2.1', 'content' => 'See {{L:1.1}}.']);

    actingAs($user);

    getJson(lintUrl($system))
        ->assertSuccessful()
        ->assertJson(['data' => []]);
});

test('lint returns 404 for a missing system', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();

    actingAs($user);

    getJson(lintUrl($system))->assertSuccessful();

    $system->delete();

    getJson(lintUrl($system))->assertNotFound();
});

// ── authorization ────────────────────────────────────────────────────────────

test('regular user cannot lint a system', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['slug' => 'core']);

    actingAs($user);

    getJson(lintUrl($system))->assertForbidden();
});

test('module subscriber cannot lint a system', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create(['slug' => 'core']);
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    getJson(lintUrl($system))->assertForbidden();
});

test('module editor can lint a system', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create(['slug' => 'core']);
    Subscription::factory()->for($user)->for($module)->editor()->create();

    actingAs($user);

    getJson(lintUrl($system))
        ->assertSuccessful()
        ->assertJson(['data' => []]);
});

test('system admin can lint a system', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['slug' => 'core']);
    Membership::factory()->for($user)->for($system)->admin()->create();

    actingAs($user);

    getJson(lintUrl($system))
        ->assertSuccessful()
        ->assertJson(['data' => []]);
});

test('super admin can lint a system', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['slug' => 'core']);

    actingAs($user);

    getJson(lintUrl($system))
        ->assertSuccessful()
        ->assertJson(['data' => []]);
});
