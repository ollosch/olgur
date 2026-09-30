<?php

declare(strict_types=1);

use App\Data\MembershipConfig;
use App\Models\Membership;
use App\Models\System;
use App\Models\User;
use Illuminate\Database\QueryException;

test('a membership can be created with factory defaults', function (): void {
    $membership = Membership::factory()->create();

    expect($membership->id)->toBeString()
        ->and($membership->user_id)->toBeString()
        ->and($membership->system_id)->toBeString()
        ->and($membership->admin)->toBeFalse();
});

test('membership uses ulid primary key', function (): void {
    $membership = Membership::factory()->create();

    expect($membership->id)->toBeString()->toHaveLength(26);
});

test('membership admin is cast to boolean', function (): void {
    $membership = Membership::factory()->admin()->create();

    expect($membership->admin)->toBeBool()->toBeTrue();
});

test('membership belongs to a user', function (): void {
    $user = User::factory()->create();
    $membership = Membership::factory()->for($user)->create();

    expect($membership->user->id)->toBe($user->id);
});

test('membership belongs to a system', function (): void {
    $system = System::factory()->create();
    $membership = Membership::factory()->for($system)->create();

    expect($membership->system->id)->toBe($system->id);
});

test('a user can only be a member of a system once', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Membership::factory()->for($user)->for($system)->create();

    expect(fn () => Membership::factory()->for($user)->for($system)->create())
        ->toThrow(QueryException::class);
});

test('same user can be a member of multiple systems', function (): void {
    $user = User::factory()->create();
    $membershipA = Membership::factory()->for($user)->create();
    $membershipB = Membership::factory()->for($user)->create();

    expect($membershipA->exists)->toBeTrue()
        ->and($membershipB->exists)->toBeTrue()
        ->and($membershipA->system_id)->not->toBe($membershipB->system_id);
});

test('user has many memberships', function (): void {
    $user = User::factory()->create();
    Membership::factory()->for($user)->count(3)->create();

    expect($user->memberships)->toHaveCount(3);
});

test('system has many memberships', function (): void {
    $system = System::factory()->create();
    Membership::factory()->for($system)->count(2)->create();

    expect($system->memberships)->toHaveCount(2)
        ->and($system->memberships->first())->toBeInstanceOf(Membership::class);
});

test('deleting a user cascades to their memberships', function (): void {
    $user = User::factory()->create();
    $membership = Membership::factory()->for($user)->create();

    $user->delete();

    expect(Membership::query()->find($membership->id))->toBeNull();
});

test('deleting a system cascades to its memberships', function (): void {
    $system = System::factory()->create();
    $membership = Membership::factory()->for($system)->create();

    $system->delete();

    expect(Membership::query()->find($membership->id))->toBeNull();
});

// ── Membership::isMember ──────────────────────────────────────────────────────

test('isMember returns true when user has a membership', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $membership = Membership::factory()->for($user)->for($system)->create();

    expect($membership->isMember($user))->toBeTrue();
});

// ── MembershipConfig ──────────────────────────────────────────────────────────

test('membership config is cast to MembershipConfig instance', function (): void {
    $membership = Membership::factory()->create([
        'config' => ['bookmarks' => [], 'ignored_tags' => ['tag-a'], 'bold_tags' => ['tag-b']],
    ]);

    $fresh = $membership->fresh();
    expect($fresh?->config)->toBeInstanceOf(MembershipConfig::class)
        ->and($fresh?->config?->bookmarks)->toBe([])
        ->and($fresh?->config?->ignoredTags)->toBe(['tag-a'])
        ->and($fresh?->config?->boldTags)->toBe(['tag-b']);
});

test('MembershipConfig::fromArray uses defaults for missing keys', function (): void {
    $config = MembershipConfig::fromArray([]);

    expect($config->bookmarks)->toBe([])
        ->and($config->ignoredTags)->toBe([])
        ->and($config->boldTags)->toBe([]);
});

test('MembershipConfig::fromArray filters malformed bookmarks', function (): void {
    $config = MembershipConfig::fromArray([
        'bookmarks' => [
            ['type' => 'rule', 'id' => 'abc123'],
            ['type' => 123, 'id' => 'abc123'],
            'not-an-array',
        ],
    ]);

    expect($config->bookmarks)->toBe([['type' => 'rule', 'id' => 'abc123']]);
});

test('MembershipConfig::fromArray filters non-string ignored and bold tags', function (): void {
    $config = MembershipConfig::fromArray([
        'ignored_tags' => ['tag-a', 123, null, 'tag-b'],
        'bold_tags' => ['tag-c', 456, null, 'tag-d'],
    ]);

    expect($config->ignoredTags)->toBe(['tag-a', 'tag-b'])
        ->and($config->boldTags)->toBe(['tag-c', 'tag-d']);
});

test('MembershipConfig::toArray serialises to the expected shape', function (): void {
    $config = MembershipConfig::fromArray([
        'bookmarks' => [['type' => 'rule', 'id' => 'abc123']],
        'ignored_tags' => ['tag-a'],
        'bold_tags' => ['tag-b'],
    ]);

    expect($config->toArray())->toBe([
        'bookmarks' => [['type' => 'rule', 'id' => 'abc123']],
        'ignored_tags' => ['tag-a'],
        'bold_tags' => ['tag-b'],
        'acronym_popups' => false,
        'preferred_rule_format' => 'content',
    ]);
});
