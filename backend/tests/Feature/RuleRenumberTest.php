<?php

declare(strict_types=1);

use App\Enums\DraftChangeClassification;
use App\Models\IndexEntry;
use App\Models\Membership;
use App\Models\Module;
use App\Models\ModuleDraftChange;
use App\Models\Rule;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\postJson;

function renumberUrl(System $system, Module $module, Rule $rule): string
{
    return '/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id.'/renumber';
}

// ── preview ──────────────────────────────────────────────────────────────────

test('renumber preview lists affected references without mutating', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->create(['slug' => 'core', 'is_core' => true]);
    $expansion = Module::factory()->for($system)->create(['slug' => 'expansion']);

    $rule = Rule::factory()->for($core)->create(['number' => '1.2', 'title' => 'Target Rule', 'content' => 'Self {{L:1.2}} ref.']);
    $sameModule = Rule::factory()->for($core)->create(['number' => '2.0', 'title' => 'Same Module', 'content' => 'See {{L:1.2}}.', 'sort_order' => 1]);
    $qualified = Rule::factory()->for($expansion)->create(['number' => '5.0', 'title' => 'Qualified', 'content' => 'See {{L:core:1.2}}.', 'sort_order' => 1]);
    Rule::factory()->for($expansion)->create(['number' => '6.0', 'title' => 'Bare Other', 'content' => 'See {{L:1.2}}.', 'sort_order' => 2]);

    $entry = IndexEntry::factory()->for($core)->create(['term' => 'Alpha', 'relations' => ['rule_refs' => ['1.2', '3.3'], 'see_also' => []]]);
    IndexEntry::factory()->for($core)->create(['term' => 'Beta', 'relations' => ['rule_refs' => ['3.3'], 'see_also' => []]]);

    actingAs($user);

    $response = postJson(renumberUrl($system, $core, $rule), ['number' => '9.9'])
        ->assertSuccessful();

    $response->assertJsonPath('data.rule.number', '1.2')
        ->assertJsonPath('data.rule.new_number', '9.9');

    $affectedRuleIds = collect($response->json('data.affected_rules'))->pluck('id')->all();
    $affectedEntryIds = collect($response->json('data.affected_index_entries'))->pluck('id')->all();

    expect($affectedRuleIds)->toHaveCount(2)
        ->toContain($sameModule->id)
        ->toContain($qualified->id)
        ->and($affectedEntryIds)->toBe([$entry->id]);

    expect($rule->fresh()->number)->toBe('1.2')
        ->and($sameModule->fresh()->content)->toBe('See {{L:1.2}}.')
        ->and($entry->fresh()->relations['rule_refs'])->toBe(['1.2', '3.3']);
});

test('renumber preview returns no affected references when none exist', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create(['slug' => 'core']);
    $rule = Rule::factory()->for($module)->create(['number' => '1.2', 'content' => 'No references.']);

    actingAs($user);

    $response = postJson(renumberUrl($system, $module, $rule), ['number' => '9.9'])
        ->assertSuccessful();

    expect($response->json('data.affected_rules'))->toBe([])
        ->and($response->json('data.affected_index_entries'))->toBe([]);
});

// ── confirm / apply ──────────────────────────────────────────────────────────

test('renumber confirm rewrites the rule, scoped references, and rule refs', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->create(['slug' => 'core', 'is_core' => true]);
    $expansion = Module::factory()->for($system)->create(['slug' => 'expansion']);

    $rule = Rule::factory()->for($core)->create(['number' => '1.2', 'content' => 'Self {{L:1.2}} ref.']);
    $sameModule = Rule::factory()->for($core)->create(['number' => '2.0', 'content' => 'See {{L:1.2}}.']);
    $qualified = Rule::factory()->for($expansion)->create(['number' => '5.0', 'content' => 'See {{L:core:1.2}}.', 'sort_order' => 1]);
    $bareOther = Rule::factory()->for($expansion)->create(['number' => '6.0', 'content' => 'See {{L:1.2}}.', 'sort_order' => 2]);

    $entry = IndexEntry::factory()->for($core)->create(['relations' => ['rule_refs' => ['1.2', '3.3'], 'see_also' => []]]);
    $unrelated = IndexEntry::factory()->for($core)->create(['relations' => ['rule_refs' => ['3.3'], 'see_also' => []]]);

    actingAs($user);

    postJson(renumberUrl($system, $core, $rule), ['number' => '9.9', 'confirm' => true])
        ->assertSuccessful()
        ->assertJsonPath('data.number', '9.9')
        ->assertJsonPath('data.content', 'Self {{L:9.9}} ref.');

    expect($sameModule->fresh()->content)->toBe('See {{L:9.9}}.')
        ->and($qualified->fresh()->content)->toBe('See {{L:core:9.9}}.')
        ->and($bareOther->fresh()->content)->toBe('See {{L:1.2}}.')
        ->and($entry->fresh()->relations['rule_refs'])->toBe(['9.9', '3.3'])
        ->and($unrelated->fresh()->relations['rule_refs'])->toBe(['3.3']);
});

test('renumber confirm records semantic draft changes for every mutation', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->create(['slug' => 'core', 'is_core' => true]);
    $expansion = Module::factory()->for($system)->create(['slug' => 'expansion']);

    $rule = Rule::factory()->for($core)->create(['number' => '1.2', 'content' => 'Self {{L:1.2}} ref.']);
    $sameModule = Rule::factory()->for($core)->create(['number' => '2.0', 'content' => 'See {{L:1.2}}.']);
    $qualified = Rule::factory()->for($expansion)->create(['number' => '5.0', 'content' => 'See {{L:core:1.2}}.', 'sort_order' => 1]);
    $entry = IndexEntry::factory()->for($core)->create(['relations' => ['rule_refs' => ['1.2'], 'see_also' => []]]);

    actingAs($user);

    postJson(renumberUrl($system, $core, $rule), ['number' => '9.9', 'confirm' => true])->assertSuccessful();

    $ruleChange = ModuleDraftChange::query()
        ->where('module_id', $core->id)
        ->where('entity_type', 'rule')
        ->where('entity_id', $rule->id)
        ->sole();

    expect($ruleChange->change_type)->toBe('update')
        ->and($ruleChange->classification)->toBe(DraftChangeClassification::Semantic)
        ->and($ruleChange->content_before['number'])->toBe('1.2')
        ->and($ruleChange->content_after['number'])->toBe('9.9');

    expect(ModuleDraftChange::query()->where('module_id', $core->id)->count())->toBe(3);
    expect(ModuleDraftChange::query()->where('module_id', $expansion->id)->count())->toBe(1);
    expect(ModuleDraftChange::query()->where('module_id', $core->id)->where('entity_type', 'index_entry')->count())->toBe(1);

    $qualifiedChange = ModuleDraftChange::query()
        ->where('module_id', $expansion->id)
        ->where('entity_id', $qualified->id)
        ->sole();

    expect($qualifiedChange->entity_type)->toBe('rule')
        ->and($qualifiedChange->content_after['content'])->toBe('See {{L:core:9.9}}.');
});

// ── collision rejection ──────────────────────────────────────────────────────

test('renumber rejects a duplicate number within the same module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Rule::factory()->for($module)->create(['number' => '9.9']);
    $rule = Rule::factory()->for($module)->create(['number' => '1.2']);

    actingAs($user);

    postJson(renumberUrl($system, $module, $rule), ['number' => '9.9', 'confirm' => true])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['number']);
});

test('renumber rejects a cross-module duplicate when global rule numbers are enabled', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create(['config' => ['global_rule_numbers' => true]]);
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    Rule::factory()->for($moduleA)->create(['number' => '9.9']);
    $rule = Rule::factory()->for($moduleB)->create(['number' => '1.2']);

    actingAs($user);

    postJson(renumberUrl($system, $moduleB, $rule), ['number' => '9.9', 'confirm' => true])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['number']);
});

test('renumber allows a cross-module duplicate when global rule numbers are disabled', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create(['config' => ['global_rule_numbers' => false]]);
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    Rule::factory()->for($moduleA)->create(['number' => '9.9']);
    $rule = Rule::factory()->for($moduleB)->create(['number' => '1.2']);

    actingAs($user);

    postJson(renumberUrl($system, $moduleB, $rule), ['number' => '9.9', 'confirm' => true])->assertSuccessful();
});

// ── validation ───────────────────────────────────────────────────────────────

test('renumber requires a number', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();

    actingAs($user);

    postJson(renumberUrl($system, $module, $rule), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['number']);
});

test('renumber returns 404 for a rule belonging to a different module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $other = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($other)->create();

    actingAs($user);

    postJson(renumberUrl($system, $module, $rule), ['number' => '9.9'])
        ->assertNotFound();
});

// ── authorization ────────────────────────────────────────────────────────────

test('regular user cannot renumber a rule', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create(['number' => '1.2']);

    actingAs($user);

    postJson(renumberUrl($system, $module, $rule), ['number' => '9.9', 'confirm' => true])->assertForbidden();
});

test('module subscriber cannot renumber a rule', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create(['number' => '1.2']);
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    postJson(renumberUrl($system, $module, $rule), ['number' => '9.9', 'confirm' => true])->assertForbidden();
});

test('module editor can renumber a rule', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create(['number' => '1.2']);
    Subscription::factory()->for($user)->for($module)->editor()->create();

    actingAs($user);

    postJson(renumberUrl($system, $module, $rule), ['number' => '9.9', 'confirm' => true])
        ->assertSuccessful()
        ->assertJsonPath('data.number', '9.9');
});

test('system admin can renumber a rule', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create(['number' => '1.2']);
    Membership::factory()->for($user)->for($system)->admin()->create();

    actingAs($user);

    postJson(renumberUrl($system, $module, $rule), ['number' => '9.9', 'confirm' => true])
        ->assertSuccessful()
        ->assertJsonPath('data.number', '9.9');
});
