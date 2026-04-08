<?php

declare(strict_types=1);

use App\Models\Module;
use App\Models\Rule;
use Illuminate\Database\QueryException;

test('a rule can be created with factory defaults', function (): void {
    $rule = Rule::factory()->create();

    expect($rule->id)->toBeString()
        ->and($rule->module_id)->toBeString()
        ->and($rule->parent_id)->toBeNull()
        ->and($rule->number)->toBeString()
        ->and($rule->title)->toBeString()
        ->and($rule->content)->toBeString();
});

test('rule uses ulid primary key', function (): void {
    $rule = Rule::factory()->create();

    expect($rule->id)->toBeString()->toHaveLength(26);
});

test('rule sort_order is cast to integer', function (): void {
    $rule = Rule::factory()->create(['sort_order' => 5]);

    expect($rule->sort_order)->toBeInt()->toBe(5);
});

test('rule belongs to a module', function (): void {
    $module = Module::factory()->create();
    $rule = Rule::factory()->for($module)->create();

    expect($rule->module->id)->toBe($module->id);
});

test('rule can have a parent rule', function (): void {
    $parent = Rule::factory()->create();
    $child = Rule::factory()->create(['parent_id' => $parent->id]);

    expect($child->parent->id)->toBe($parent->id);
});

test('rule can have children', function (): void {
    $parent = Rule::factory()->create();
    Rule::factory()->count(3)->create(['parent_id' => $parent->id]);

    expect($parent->children)->toHaveCount(3);
});

test('children are ordered by sort_order', function (): void {
    $parent = Rule::factory()->create();
    $third = Rule::factory()->create(['parent_id' => $parent->id, 'sort_order' => 30]);
    $first = Rule::factory()->create(['parent_id' => $parent->id, 'sort_order' => 10]);
    $second = Rule::factory()->create(['parent_id' => $parent->id, 'sort_order' => 20]);

    $children = $parent->children;

    expect($children->pluck('id')->all())->toBe([$first->id, $second->id, $third->id]);
});

test('rule number is unique per module', function (): void {
    $module = Module::factory()->create();
    Rule::factory()->for($module)->create(['number' => 'A.1']);

    expect(fn () => Rule::factory()->for($module)->create(['number' => 'A.1']))
        ->toThrow(QueryException::class);
});

test('same rule number is allowed across different modules', function (): void {
    $moduleA = Module::factory()->create();
    $moduleB = Module::factory()->create();
    $ruleA = Rule::factory()->for($moduleA)->create(['number' => 'A.1']);
    $ruleB = Rule::factory()->for($moduleB)->create(['number' => 'A.1']);

    expect($ruleA->exists)->toBeTrue()
        ->and($ruleB->exists)->toBeTrue();
});

test('module has many rules ordered by sort_order', function (): void {
    $module = Module::factory()->create();
    Rule::factory()->for($module)->count(3)->create();

    expect($module->rules)->toHaveCount(3)
        ->and($module->rules->first())->toBeInstanceOf(Rule::class);
});

test('deleting a module cascades to its rules', function (): void {
    $module = Module::factory()->create();
    $rule = Rule::factory()->for($module)->create();

    $module->delete();

    expect(Rule::query()->find($rule->id))->toBeNull();
});
