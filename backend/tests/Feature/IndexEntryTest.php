<?php

declare(strict_types=1);

use App\Models\IndexEntry;
use App\Models\Module;

test('an index entry can be created with factory defaults', function (): void {
    $entry = IndexEntry::factory()->create();

    expect($entry->id)->toBeString()
        ->and($entry->module_id)->toBeString()
        ->and($entry->parent_id)->toBeNull()
        ->and($entry->term)->toBeString()
        ->and($entry->definition)->toBeString()
        ->and($entry->relations)->toBeArray();
});

test('index entry uses ulid primary key', function (): void {
    $entry = IndexEntry::factory()->create();

    expect($entry->id)->toBeString()->toHaveLength(26);
});

test('index entry relations is cast to array', function (): void {
    $entry = IndexEntry::factory()->create(['relations' => ['rule_refs' => ['A.1', 'B.2'], 'see_also' => ['DR', 'TEM']]]);

    expect($entry->relations)->toBeArray()->toBe(['rule_refs' => ['A.1', 'B.2'], 'see_also' => ['DR', 'TEM']]);
});

test('index entry belongs to a module', function (): void {
    $module = Module::factory()->create();
    $entry = IndexEntry::factory()->for($module)->create();

    expect($entry->module->id)->toBe($module->id);
});

test('index entry can have a parent entry', function (): void {
    $parent = IndexEntry::factory()->create();
    $child = IndexEntry::factory()->create(['parent_id' => $parent->id]);

    expect($child->parent->id)->toBe($parent->id);
});

test('index entry can have children', function (): void {
    $parent = IndexEntry::factory()->create();
    IndexEntry::factory()->count(3)->create(['parent_id' => $parent->id]);

    expect($parent->children)->toHaveCount(3);
});

test('module has many index entries', function (): void {
    $module = Module::factory()->create();
    IndexEntry::factory()->for($module)->count(3)->create();

    expect($module->indexEntries)->toHaveCount(3)
        ->and($module->indexEntries->first())->toBeInstanceOf(IndexEntry::class);
});

test('deleting a module cascades to its index entries', function (): void {
    $module = Module::factory()->create();
    $entry = IndexEntry::factory()->for($module)->create();

    $module->delete();

    expect(IndexEntry::query()->find($entry->id))->toBeNull();
});
