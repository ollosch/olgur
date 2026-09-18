<?php

declare(strict_types=1);

use App\Enums\DraftChangeClassification;
use App\Models\Module;
use App\Models\ModuleDraftChange;
use App\Models\Rule;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseMissing;
use function Pest\Laravel\deleteJson;

function ruleDeleteUrl(System $system, Module $module, Rule $rule): string
{
    return '/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id;
}

// ── delete with no children ──────────────────────────────────────────────────

test('destroy with no children deletes the rule and records a delete change', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();

    actingAs($user);

    deleteJson(ruleDeleteUrl($system, $module, $rule))
        ->assertNoContent();

    assertDatabaseMissing('rules', ['id' => $rule->id]);

    $change = ModuleDraftChange::query()
        ->where('module_id', $module->id)
        ->where('entity_type', 'rule')
        ->where('entity_id', $rule->id)
        ->sole();

    expect($change->change_type)->toBe('delete')
        ->and($change->classification)->toBe(DraftChangeClassification::Semantic)
        ->and($change->content_before['number'])->toBe($rule->number)
        ->and($change->content_after)->toBeNull();
});

// ── re_parent mode ───────────────────────────────────────────────────────────

test('destroy re_parents direct children to the deleted rule parent', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $grandparent = Rule::factory()->for($module)->create();
    $rule = Rule::factory()->for($module)->create(['parent_id' => $grandparent->id]);
    $childA = Rule::factory()->for($module)->create(['parent_id' => $rule->id]);
    $childB = Rule::factory()->for($module)->create(['parent_id' => $rule->id]);

    actingAs($user);

    deleteJson(ruleDeleteUrl($system, $module, $rule), ['mode' => 're_parent'])
        ->assertNoContent();

    assertDatabaseMissing('rules', ['id' => $rule->id]);

    expect($childA->fresh()->parent_id)->toBe($grandparent->id)
        ->and($childB->fresh()->parent_id)->toBe($grandparent->id);
});

test('destroy defaults to re_parent when no mode is supplied', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    $child = Rule::factory()->for($module)->create(['parent_id' => $rule->id]);

    actingAs($user);

    deleteJson(ruleDeleteUrl($system, $module, $rule))
        ->assertNoContent();

    assertDatabaseMissing('rules', ['id' => $rule->id]);

    expect($child->fresh()->parent_id)->toBeNull();
});

test('destroy re_parent keeps grandchildren attached to their moved parent', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    $child = Rule::factory()->for($module)->create(['parent_id' => $rule->id]);
    $grandchild = Rule::factory()->for($module)->create(['parent_id' => $child->id]);

    actingAs($user);

    deleteJson(ruleDeleteUrl($system, $module, $rule), ['mode' => 're_parent'])
        ->assertNoContent();

    expect($child->fresh()->parent_id)->toBeNull()
        ->and($grandchild->fresh()->parent_id)->toBe($child->id);
});

test('destroy re_parent records update changes for children and a delete for the rule', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    $child = Rule::factory()->for($module)->create(['parent_id' => $rule->id]);

    actingAs($user);

    deleteJson(ruleDeleteUrl($system, $module, $rule), ['mode' => 're_parent'])
        ->assertNoContent();

    $childChange = ModuleDraftChange::query()
        ->where('module_id', $module->id)
        ->where('entity_id', $child->id)
        ->sole();

    expect($childChange->change_type)->toBe('update')
        ->and($childChange->content_before['parent_id'])->toBe($rule->id)
        ->and($childChange->content_after['parent_id'])->toBeNull();

    $ruleChange = ModuleDraftChange::query()
        ->where('module_id', $module->id)
        ->where('entity_id', $rule->id)
        ->sole();

    expect($ruleChange->change_type)->toBe('delete')
        ->and($ruleChange->content_after)->toBeNull();
});

// ── recursive mode ───────────────────────────────────────────────────────────

test('destroy recursive deletes the entire subtree', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    $child = Rule::factory()->for($module)->create(['parent_id' => $rule->id]);
    $grandchild = Rule::factory()->for($module)->create(['parent_id' => $child->id]);
    $sibling = Rule::factory()->for($module)->create(['parent_id' => $rule->id]);

    actingAs($user);

    deleteJson(ruleDeleteUrl($system, $module, $rule), ['mode' => 'recursive'])
        ->assertNoContent();

    assertDatabaseMissing('rules', ['id' => $rule->id]);
    assertDatabaseMissing('rules', ['id' => $child->id]);
    assertDatabaseMissing('rules', ['id' => $grandchild->id]);
    assertDatabaseMissing('rules', ['id' => $sibling->id]);
});

test('destroy recursive records a delete change for every rule in the subtree', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    $child = Rule::factory()->for($module)->create(['parent_id' => $rule->id]);
    $grandchild = Rule::factory()->for($module)->create(['parent_id' => $child->id]);

    actingAs($user);

    deleteJson(ruleDeleteUrl($system, $module, $rule), ['mode' => 'recursive'])
        ->assertNoContent();

    $changes = ModuleDraftChange::query()
        ->where('module_id', $module->id)
        ->where('entity_type', 'rule')
        ->get();

    expect($changes)->toHaveCount(3)
        ->and($changes->pluck('change_type')->unique()->all())->toBe(['delete'])
        ->and($changes->pluck('entity_id')->all())
        ->toContain($rule->id, $child->id, $grandchild->id);
});

// ── validation ───────────────────────────────────────────────────────────────

test('destroy rejects an invalid mode', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();

    actingAs($user);

    deleteJson(ruleDeleteUrl($system, $module, $rule), ['mode' => 'bogus'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['mode']);
});
