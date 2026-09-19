<?php

declare(strict_types=1);

use App\Data\ModuleConfig;
use App\Enums\GameDataType;
use App\Models\GameDatum;
use App\Models\Module;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;
use Illuminate\Database\QueryException;

test('a module can be created with factory defaults', function (): void {
    $module = Module::factory()->create();

    expect($module->id)->toBeString()
        ->and($module->slug)->toBeString()
        ->and($module->name)->toBeString()
        ->and($module->is_core)->toBeFalse()
        ->and($module->config)->toBeInstanceOf(ModuleConfig::class)
        ->and($module->config->toArray())->toBe([]);
});

test('module uses ulid primary key', function (): void {
    $module = Module::factory()->create();

    expect($module->id)->toBeString()->toHaveLength(26);
});

test('module slug is unique per system', function (): void {
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['slug' => 'core']);

    expect(fn () => Module::factory()->for($system)->create(['slug' => 'core']))
        ->toThrow(QueryException::class);
});

test('same slug is allowed across different systems', function (): void {
    Module::factory()->create(['slug' => 'core']);
    $other = Module::factory()->create(['slug' => 'core']);

    expect($other->exists)->toBeTrue();
});

test('module config retains arbitrary values', function (): void {
    $module = Module::factory()->create([
        'config' => [
            'display' => ['theme' => 'dark'],
        ],
    ]);
    $module->refresh();

    expect($module->config->toArray())->toBe([
        'display' => ['theme' => 'dark'],
    ]);
});

test('module is_core is cast to boolean', function (): void {
    $module = Module::factory()->core()->create();

    expect($module->is_core)->toBeBool()->toBeTrue();
});

test('module belongs to a system', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    expect($module->system->id)->toBe($system->id);
});

test('system has many modules ordered by sort_order', function (): void {
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['sort_order' => 10, 'slug' => 'expansion']);
    Module::factory()->for($system)->create(['sort_order' => 0, 'slug' => 'core']);

    $slugs = $system->modules->pluck('slug')->all();

    expect($slugs)->toBe(['core', 'expansion']);
});

test('deleting a system cascades to its modules', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    $system->delete();

    expect(Module::query()->find($module->id))->toBeNull();
});

// ── Module::sop ──────────────────────────────────────────────────────────────

test('sop returns the module sop row', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $sop = GameDatum::factory()->for($module)->create(['type' => GameDataType::Sop, 'slug' => 'asop']);

    expect($module->sop()?->id)->toBe($sop->id);
});

test('sop returns null when the module has no sop', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    GameDatum::factory()->for($module)->create(['type' => GameDataType::Table, 'slug' => 'ift']);

    expect($module->sop())->toBeNull();
});

// ── Module::tables ───────────────────────────────────────────────────────────

test('tables returns game data of type table keyed by slug', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $ift = GameDatum::factory()->for($module)->create(['type' => GameDataType::Table, 'slug' => 'ift']);
    $tct = GameDatum::factory()->for($module)->create(['type' => GameDataType::Table, 'slug' => 'tct']);
    GameDatum::factory()->for($module)->create(['type' => GameDataType::Sop, 'slug' => 'asop']);

    $tables = $module->tables();

    expect($tables)->toHaveCount(2)
        ->and($tables->get('ift')?->id)->toBe($ift->id)
        ->and($tables->get('tct')?->id)->toBe($tct->id)
        ->and($tables->has('asop'))->toBeFalse();
});

test('tables returns an empty collection when the module has no tables', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    expect($module->tables())->toBeEmpty();
});

// ── Module::resolveGameDatum ─────────────────────────────────────────────────

test('resolveGameDatum prefers the current module over core', function (): void {
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->core()->create();
    $expansion = Module::factory()->for($system)->create();
    GameDatum::factory()->for($core)->create(['type' => GameDataType::Table, 'slug' => 'ift']);
    $expansionTable = GameDatum::factory()->for($expansion)->create(['type' => GameDataType::Table, 'slug' => 'ift']);

    expect($expansion->resolveGameDatum(GameDataType::Table, 'ift')?->id)->toBe($expansionTable->id);
});

test('resolveGameDatum prefers the current module sop over core', function (): void {
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->core()->create();
    $expansion = Module::factory()->for($system)->create();
    GameDatum::factory()->for($core)->create(['type' => GameDataType::Sop, 'slug' => 'asop']);
    $expansionSop = GameDatum::factory()->for($expansion)->create(['type' => GameDataType::Sop, 'slug' => 'asop']);

    expect($expansion->resolveGameDatum(GameDataType::Sop, 'asop')?->id)->toBe($expansionSop->id);
});

test('resolveGameDatum falls back to core when the module has none', function (): void {
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->core()->create();
    $expansion = Module::factory()->for($system)->create();
    $coreTable = GameDatum::factory()->for($core)->create(['type' => GameDataType::Table, 'slug' => 'ift']);

    expect($expansion->resolveGameDatum(GameDataType::Table, 'ift')?->id)->toBe($coreTable->id);
});

test('resolveGameDatum returns null when neither module nor core has the datum', function (): void {
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->core()->create();
    $expansion = Module::factory()->for($system)->create();

    expect($expansion->resolveGameDatum(GameDataType::Table, 'missing'))->toBeNull();
});

test('resolveGameDatum does not fall back when the module is the core', function (): void {
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->core()->create();

    expect($core->resolveGameDatum(GameDataType::Table, 'missing'))->toBeNull();
});

test('resolveGameDatum returns null when the system has no core module', function (): void {
    $system = System::factory()->create();
    $expansion = Module::factory()->for($system)->create();

    expect($expansion->resolveGameDatum(GameDataType::Table, 'ift'))->toBeNull();
});

// ── Module::isSubscriber ──────────────────────────────────────────────────────

test('isSubscriber returns true when user has a subscription', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();

    expect($module->isSubscriber($user))->toBeTrue();
});

test('isSubscriber returns false when user has no subscription', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    expect($module->isSubscriber($user))->toBeFalse();
});

// ── Module::isEditor ──────────────────────────────────────────────────────

test('isEditor returns true when user is an editor', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();

    expect($module->isEditor($user))->toBeTrue();
});

test('isEditor returns false when user is not an editor', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    expect($module->isEditor($user))->toBeFalse();
});
