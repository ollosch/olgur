<?php

declare(strict_types=1);

use App\Models\ModuleVersion;
use App\Models\Rule;
use App\Models\RuleVersion;

test('a rule_version can be created with factory defaults', function (): void {
    $ruleVersion = RuleVersion::factory()->create();

    expect($ruleVersion->id)->toBeString()
        ->and($ruleVersion->rule_id)->toBeString()
        ->and($ruleVersion->module_version_id)->toBeString()
        ->and($ruleVersion->parent_id)->toBeNull()
        ->and($ruleVersion->number)->toBeString()
        ->and($ruleVersion->title)->toBeString();
});

test('rule_version uses ulid primary key', function (): void {
    $ruleVersion = RuleVersion::factory()->create();

    expect($ruleVersion->id)->toBeString()->toHaveLength(26);
});

test('rule_version belongs to a rule', function (): void {
    $rule = Rule::factory()->create();
    $ruleVersion = RuleVersion::factory()->for($rule)->create();

    expect($ruleVersion->rule->id)->toBe($rule->id);
});

test('rule_version belongs to a module_version', function (): void {
    $moduleVersion = ModuleVersion::factory()->create();
    $ruleVersion = RuleVersion::factory()->for($moduleVersion)->create();

    expect($ruleVersion->moduleVersion->id)->toBe($moduleVersion->id);
});

test('rule_version has parent and children relationships', function (): void {
    $parent = RuleVersion::factory()->create();
    $child = RuleVersion::factory()->create(['parent_id' => $parent->id]);

    expect($child->parent->id)->toBe($parent->id)
        ->and($parent->children)->toHaveCount(1)
        ->and($parent->children->first()->id)->toBe($child->id);
});

test('rule has many rule_versions', function (): void {
    $rule = Rule::factory()->create();
    RuleVersion::factory()->for($rule)->count(3)->create();

    expect($rule->ruleVersions)->toHaveCount(3)
        ->and($rule->ruleVersions->first())->toBeInstanceOf(RuleVersion::class);
});

test('module_version has many rule_versions', function (): void {
    $moduleVersion = ModuleVersion::factory()->create();
    RuleVersion::factory()->for($moduleVersion)->count(3)->create();

    expect($moduleVersion->ruleVersions)->toHaveCount(3)
        ->and($moduleVersion->ruleVersions->first())->toBeInstanceOf(RuleVersion::class);
});

test('deleting a rule nullifies rule_id on its rule_versions', function (): void {
    $rule = Rule::factory()->create();
    $ruleVersion = RuleVersion::factory()->for($rule)->create();

    $rule->delete();

    expect(RuleVersion::query()->find($ruleVersion->id))->not->toBeNull()
        ->and(RuleVersion::query()->find($ruleVersion->id)->rule_id)->toBeNull();
});

test('deleting a module_version cascades to its rule_versions', function (): void {
    $moduleVersion = ModuleVersion::factory()->create();
    $ruleVersion = RuleVersion::factory()->for($moduleVersion)->create();

    $moduleVersion->delete();

    expect(RuleVersion::query()->find($ruleVersion->id))->toBeNull();
});

test('rule_version children are ordered by sort_order', function (): void {
    $parent = RuleVersion::factory()->create();
    $third = RuleVersion::factory()->create(['parent_id' => $parent->id, 'sort_order' => 30]);
    $first = RuleVersion::factory()->create(['parent_id' => $parent->id, 'sort_order' => 10]);
    $second = RuleVersion::factory()->create(['parent_id' => $parent->id, 'sort_order' => 20]);

    $children = $parent->children;

    expect($children->pluck('id')->all())->toBe([$first->id, $second->id, $third->id]);
});

test('rule_version sort_order is cast to integer', function (): void {
    $ruleVersion = RuleVersion::factory()->create(['sort_order' => 5]);

    expect($ruleVersion->sort_order)->toBeInt()->toBe(5);
});
