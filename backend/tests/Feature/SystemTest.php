<?php

declare(strict_types=1);

use App\Data\SystemConfig;
use App\Models\Membership;
use App\Models\Module;
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

// ── System::isProofreader ─────────────────────────────────────────────────

test('isProofreader returns true when user is a proofreader', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Membership::factory()->for($user)->for($system)->proofreader()->create();

    expect($system->isProofreader($user))->toBeTrue();
});

test('isProofreader returns false when user is not a proofreader', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();

    expect($system->isProofreader($user))->toBeFalse();
});

// ── System::coreModule ─────────────────────────────────────────────────────

test('coreModule returns the core module', function (): void {
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->core()->create();
    Module::factory()->for($system)->create();

    expect($system->coreModule()?->id)->toBe($core->id);
});

test('coreModule returns null when there is no core module', function (): void {
    $system = System::factory()->create();

    expect($system->coreModule())->toBeNull();
});

// ── SystemConfig ──────────────────────────────────────────────────────────

test('SystemConfig::fromArray uses defaults for missing keys', function (): void {
    $config = SystemConfig::fromArray([]);

    expect($config->globalRuleNumbers)->toBeFalse()
        ->and($config->sortRulesBy)->toBe('sort_order')
        ->and($config->tocDepth)->toBe(1)
        ->and($config->coverImage)->toBeNull()
        ->and($config->proofreadThreshold)->toBe(3);
});

test('SystemConfig::fromArray uses provided values', function (): void {
    $config = SystemConfig::fromArray([
        'global_rule_numbers' => true,
        'sort_rules_by' => 'number',
        'toc_depth' => 3,
        'cover_image' => 'https://example.com/cover.jpg',
    ]);

    expect($config->globalRuleNumbers)->toBeTrue()
        ->and($config->sortRulesBy)->toBe('number')
        ->and($config->tocDepth)->toBe(3)
        ->and($config->coverImage)->toBe('https://example.com/cover.jpg');
});

test('SystemConfig::toArray serialises to the expected shape', function (): void {
    $config = SystemConfig::fromArray([
        'global_rule_numbers' => true,
        'sort_rules_by' => 'number',
        'toc_depth' => 2,
        'cover_image' => null,
    ]);

    expect($config->toArray())->toBe([
        'global_rule_numbers' => true,
        'sort_rules_by' => 'number',
        'toc_depth' => 2,
        'cover_image' => null,
        'proofread_threshold' => 3,
    ]);
});

test('SystemConfig::hasGlobalRuleNumbers returns false when not set', function (): void {
    $config = SystemConfig::fromArray([]);

    expect($config->hasGlobalRuleNumbers())->toBeFalse();
});

test('SystemConfig::hasGlobalRuleNumbers returns true when set', function (): void {
    $config = SystemConfig::fromArray(['global_rule_numbers' => true]);

    expect($config->hasGlobalRuleNumbers())->toBeTrue();
});

test('system config is persisted and retrieved correctly', function (): void {
    $system = System::factory()->create([
        'config' => [
            'global_rule_numbers' => true,
            'sort_rules_by' => 'number',
            'toc_depth' => 4,
            'cover_image' => 'https://example.com/img.png',
        ],
    ]);

    $fresh = $system->fresh();

    expect($fresh->config)->toBeInstanceOf(SystemConfig::class)
        ->and($fresh->config->globalRuleNumbers)->toBeTrue()
        ->and($fresh->config->sortRulesBy)->toBe('number')
        ->and($fresh->config->tocDepth)->toBe(4)
        ->and($fresh->config->coverImage)->toBe('https://example.com/img.png');
});
