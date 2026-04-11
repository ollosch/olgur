<?php

declare(strict_types=1);

use App\Models\IndexEntry;
use App\Models\IndexEntryVersion;
use App\Models\ModuleVersion;

test('an index_entry_version can be created with factory defaults', function (): void {
    $version = IndexEntryVersion::factory()->create();

    expect($version->id)->toBeString()
        ->and($version->index_entry_id)->toBeString()
        ->and($version->module_version_id)->toBeString()
        ->and($version->parent_id)->toBeNull()
        ->and($version->term)->toBeString()
        ->and($version->relations)->toBeNull();
});

test('index_entry_version uses ulid primary key', function (): void {
    $version = IndexEntryVersion::factory()->create();

    expect($version->id)->toBeString()->toHaveLength(26);
});

test('index_entry_version belongs to an index_entry', function (): void {
    $indexEntry = IndexEntry::factory()->create();
    $version = IndexEntryVersion::factory()->for($indexEntry)->create();

    expect($version->indexEntry->id)->toBe($indexEntry->id);
});

test('index_entry_version belongs to a module_version', function (): void {
    $moduleVersion = ModuleVersion::factory()->create();
    $version = IndexEntryVersion::factory()->for($moduleVersion)->create();

    expect($version->moduleVersion->id)->toBe($moduleVersion->id);
});

test('index_entry_version has parent and children relationships', function (): void {
    $parent = IndexEntryVersion::factory()->create();
    $child = IndexEntryVersion::factory()->create(['parent_id' => $parent->id]);

    expect($child->parent->id)->toBe($parent->id)
        ->and($parent->children)->toHaveCount(1)
        ->and($parent->children->first()->id)->toBe($child->id);
});

test('index_entry has many index_entry_versions', function (): void {
    $indexEntry = IndexEntry::factory()->create();
    IndexEntryVersion::factory()->for($indexEntry)->count(3)->create();

    expect($indexEntry->indexEntryVersions)->toHaveCount(3)
        ->and($indexEntry->indexEntryVersions->first())->toBeInstanceOf(IndexEntryVersion::class);
});

test('module_version has many index_entry_versions', function (): void {
    $moduleVersion = ModuleVersion::factory()->create();
    IndexEntryVersion::factory()->for($moduleVersion)->count(3)->create();

    expect($moduleVersion->indexEntryVersions)->toHaveCount(3)
        ->and($moduleVersion->indexEntryVersions->first())->toBeInstanceOf(IndexEntryVersion::class);
});

test('deleting an index_entry nullifies index_entry_id on its index_entry_versions', function (): void {
    $indexEntry = IndexEntry::factory()->create();
    $version = IndexEntryVersion::factory()->for($indexEntry)->create();

    $indexEntry->delete();

    expect(IndexEntryVersion::query()->find($version->id))->not->toBeNull()
        ->and(IndexEntryVersion::query()->find($version->id)->index_entry_id)->toBeNull();
});

test('deleting a module_version cascades to its index_entry_versions', function (): void {
    $moduleVersion = ModuleVersion::factory()->create();
    $version = IndexEntryVersion::factory()->for($moduleVersion)->create();

    $moduleVersion->delete();

    expect(IndexEntryVersion::query()->find($version->id))->toBeNull();
});

test('index_entry_version relations is cast to array', function (): void {
    $version = IndexEntryVersion::factory()->create(['relations' => ['key' => 'value']]);

    expect($version->relations)->toBeArray()->toBe(['key' => 'value']);
});
