<?php

declare(strict_types=1);

use App\Actions\PublishModuleVersion;
use App\Enums\GameDataType;
use App\Models\GameDatum;
use App\Models\GameDatumVersion;
use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\System;
use App\Models\User;

test('a game_datum_version can be created with factory defaults', function (): void {
    $gameDatumVersion = GameDatumVersion::factory()->create();

    expect($gameDatumVersion->id)->toBeString()
        ->and($gameDatumVersion->game_datum_id)->toBeString()
        ->and($gameDatumVersion->module_version_id)->toBeString()
        ->and($gameDatumVersion->type)->toBeInstanceOf(GameDataType::class)
        ->and($gameDatumVersion->slug)->toBeString()
        ->and($gameDatumVersion->content)->toBeArray();
});

test('game_datum_version uses ulid primary key', function (): void {
    $gameDatumVersion = GameDatumVersion::factory()->create();

    expect($gameDatumVersion->id)->toBeString()->toHaveLength(26);
});

test('game_datum_version belongs to a game_datum', function (): void {
    $gameDatum = GameDatum::factory()->create();
    $gameDatumVersion = GameDatumVersion::factory()->for($gameDatum)->create();

    expect($gameDatumVersion->gameDatum->id)->toBe($gameDatum->id);
});

test('game_datum_version belongs to a module_version', function (): void {
    $moduleVersion = ModuleVersion::factory()->create();
    $gameDatumVersion = GameDatumVersion::factory()->for($moduleVersion)->create();

    expect($gameDatumVersion->moduleVersion->id)->toBe($moduleVersion->id);
});

test('game_datum has many game_datum_versions', function (): void {
    $gameDatum = GameDatum::factory()->create();
    GameDatumVersion::factory()->for($gameDatum)->count(3)->create();

    expect($gameDatum->gameDatumVersions)->toHaveCount(3)
        ->and($gameDatum->gameDatumVersions->first())->toBeInstanceOf(GameDatumVersion::class);
});

test('module_version has many game_datum_versions', function (): void {
    $moduleVersion = ModuleVersion::factory()->create();
    GameDatumVersion::factory()->for($moduleVersion)->count(3)->create();

    expect($moduleVersion->gameDatumVersions)->toHaveCount(3)
        ->and($moduleVersion->gameDatumVersions->first())->toBeInstanceOf(GameDatumVersion::class);
});

test('deleting a game_datum nullifies game_datum_id on its versions', function (): void {
    $gameDatum = GameDatum::factory()->create();
    $gameDatumVersion = GameDatumVersion::factory()->for($gameDatum)->create();

    $gameDatum->delete();

    expect(GameDatumVersion::query()->find($gameDatumVersion->id))->not->toBeNull()
        ->and(GameDatumVersion::query()->find($gameDatumVersion->id)->game_datum_id)->toBeNull();
});

test('deleting a module_version cascades to its game_datum_versions', function (): void {
    $moduleVersion = ModuleVersion::factory()->create();
    $gameDatumVersion = GameDatumVersion::factory()->for($moduleVersion)->create();

    $moduleVersion->delete();

    expect(GameDatumVersion::query()->find($gameDatumVersion->id))->toBeNull();
});

test('publish snapshots game data into game_datum_versions', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    GameDatum::factory()->for($module)->create(['type' => GameDataType::Sop, 'slug' => 'asop', 'content' => ['phases' => []]]);
    GameDatum::factory()->for($module)->create(['type' => GameDataType::Vehicle, 'slug' => 'pzib', 'content' => ['name' => 'PzKpfw IB']]);

    $moduleVersion = resolve(PublishModuleVersion::class)->execute($module, $user, '1.0.0', '', 0, []);

    expect(GameDatumVersion::query()->where('module_version_id', $moduleVersion->id)->count())->toBe(2);
});
