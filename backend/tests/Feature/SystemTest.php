<?php

declare(strict_types=1);

use App\Data\SystemConfig;
use App\Enums\SystemStructure;
use App\Models\Membership;
use App\Models\System;
use App\Models\User;

test('a system can be created with factory defaults', function (): void {
    $system = System::factory()->create();

    expect($system->id)->toBeString()
        ->and($system->slug)->toBeString()
        ->and($system->name)->toBeString()
        ->and($system->config)->toBeNull();
});

test('system slug is unique', function (): void {
    $system = System::factory()->create(['slug' => 'asl']);

    expect($system->slug)->toBe('asl');
});

test('system config is cast to SystemConfig when set', function (): void {
    $system = System::factory()->withTocDepth(2)->create();

    expect($system->config)->toBeInstanceOf(SystemConfig::class)
        ->and($system->config->tocDepth)->toBe(2);
});

test('system config is null by default', function (): void {
    $system = System::factory()->create();
    $fresh = $system->fresh();

    expect($fresh->config)->toBeNull();
});

test('system uses ulid primary key', function (): void {
    $system = System::factory()->create();

    expect($system->id)->toBeString()->toHaveLength(26);
});

// ── System::isMember ──────────────────────────────────────────────────────

test('isMember returns true when user has a membership', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Membership::factory()->for($user)->for($system)->create();

    expect($system->isMember($user))->toBeTrue();
});

test('isMember returns false when user has no membership', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();

    expect($system->isMember($user))->toBeFalse();
});

// ── System::isAdmin ──────────────────────────────────────────────────────

test('isAdmin returns true when user is an admin', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Membership::factory()->for($user)->for($system)->admin()->create();

    expect($system->isAdmin($user))->toBeTrue();
});

test('isAdmin returns false when user is not an admin', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();

    expect($system->isAdmin($user))->toBeFalse();
});

// ── SystemConfig ──────────────────────────────────────────────────────────

test('SystemConfig::fromArray uses defaults for missing keys', function (): void {
    $config = SystemConfig::fromArray([]);

    expect($config->structure)->toBe(SystemStructure::GroupingOnly)
        ->and($config->sortRulesBy)->toBe('sort_order')
        ->and($config->tocDepth)->toBe(1)
        ->and($config->coverImage)->toBeNull();
});

test('SystemConfig::fromArray uses provided values', function (): void {
    $config = SystemConfig::fromArray([
        'system_structure' => 'core_plus_many',
        'sort_rules_by' => 'number',
        'toc_depth' => 3,
        'cover_image' => 'https://example.com/cover.jpg',
    ]);

    expect($config->structure)->toBe(SystemStructure::CorePlusMany)
        ->and($config->sortRulesBy)->toBe('number')
        ->and($config->tocDepth)->toBe(3)
        ->and($config->coverImage)->toBe('https://example.com/cover.jpg');
});

test('SystemConfig::toArray serialises to the expected shape', function (): void {
    $config = SystemConfig::fromArray([
        'system_structure' => 'core_plus_many',
        'sort_rules_by' => 'number',
        'toc_depth' => 2,
        'cover_image' => null,
    ]);

    expect($config->toArray())->toBe([
        'system_structure' => 'core_plus_many',
        'sort_rules_by' => 'number',
        'toc_depth' => 2,
        'cover_image' => null,
    ]);
});

test('SystemConfig::enforceSystemWideRuleNumbers returns true for core module', function (): void {
    $config = SystemConfig::fromArray(['system_structure' => 'grouping_only']);

    expect($config->enforceSystemWideRuleNumbers(true))->toBeTrue()
        ->and($config->enforceSystemWideRuleNumbers(false))->toBeFalse();
});

test('SystemConfig::enforceSystemWideRuleNumbers returns true when core_plus_many', function (): void {
    $config = SystemConfig::fromArray(['system_structure' => 'core_plus_many']);

    expect($config->enforceSystemWideRuleNumbers(false))->toBeTrue();
});

test('system config is persisted and retrieved correctly', function (): void {
    $system = System::factory()->create([
        'config' => [
            'system_structure' => 'core_plus_many',
            'sort_rules_by' => 'number',
            'toc_depth' => 4,
            'cover_image' => 'https://example.com/img.png',
        ],
    ]);

    $fresh = $system->fresh();

    expect($fresh->config)->toBeInstanceOf(SystemConfig::class)
        ->and($fresh->config->structure)->toBe(SystemStructure::CorePlusMany)
        ->and($fresh->config->sortRulesBy)->toBe('number')
        ->and($fresh->config->tocDepth)->toBe(4)
        ->and($fresh->config->coverImage)->toBe('https://example.com/img.png');
});
