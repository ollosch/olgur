<?php

declare(strict_types=1);

use App\Models\GameDatum;
use App\Models\IndexEntry;
use App\Models\Proofread;
use App\Models\Rule;
use App\Models\System;
use App\Models\User;

test('resolveEntity resolves a rule', function (): void {
    $rule = Rule::factory()->create();

    expect(Proofread::resolveEntity(Proofread::ENTITY_TYPE_RULE, $rule->id)?->id)->toBe($rule->id);
});

test('resolveEntity resolves an index entry', function (): void {
    $entry = IndexEntry::factory()->create();

    expect(Proofread::resolveEntity(Proofread::ENTITY_TYPE_INDEX_ENTRY, $entry->id)?->id)->toBe($entry->id);
});

test('resolveEntity resolves a game datum', function (): void {
    $datum = GameDatum::factory()->create();

    expect(Proofread::resolveEntity(Proofread::ENTITY_TYPE_GAME_DATUM, $datum->id)?->id)->toBe($datum->id);
});

test('resolveEntity returns null for an unknown entity type', function (): void {
    expect(Proofread::resolveEntity('unknown', 'any'))->toBeNull();
});

test('a proofread belongs to a user', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $rule = Rule::factory()->create();
    $proofread = Proofread::query()->create([
        'user_id' => $user->id,
        'system_id' => $system->id,
        'entity_type' => 'rule',
        'entity_id' => $rule->id,
    ]);

    expect($proofread->user()->first()?->id)->toBe($user->id);
});
