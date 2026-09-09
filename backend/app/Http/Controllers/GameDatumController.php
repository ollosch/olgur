<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\RemoveModuleFromMembershipConfigs;
use App\Enums\GameDataType;
use App\Http\Requests\StoreGameDatumRequest;
use App\Http\Requests\UpdateGameDatumRequest;
use App\Http\Resources\GameDatumResource;
use App\Models\GameDatum;
use App\Models\Module;
use App\Models\ModuleDraftChange;
use App\Models\System;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

final class GameDatumController
{
    /**
     * Display a listing of game data for the given module.
     */
    public function index(System $system, Module $module): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [GameDatum::class, $system, $module]);

        return GameDatumResource::collection(
            $module->gameData()->get()
        );
    }

    /**
     * Store a newly created game datum within the given module.
     */
    public function store(StoreGameDatumRequest $request, System $system, Module $module): GameDatumResource
    {
        Gate::authorize('create', [GameDatum::class, $system, $module]);

        $gameDatum = $module->gameData()->create($request->validated());

        return new GameDatumResource($gameDatum);
    }

    /**
     * Display the specified game datum.
     */
    public function show(System $system, Module $module, GameDatum $gameDatum): GameDatumResource
    {
        Gate::authorize('view', [GameDatum::class, $system, $module]);

        return new GameDatumResource($gameDatum);
    }

    /**
     * Update the specified game datum.
     */
    public function update(
        UpdateGameDatumRequest $request,
        System $system,
        Module $module,
        GameDatum $gameDatum,
        RemoveModuleFromMembershipConfigs $removeModuleFromMembershipConfigs,
    ): GameDatumResource {
        Gate::authorize('update', [GameDatum::class, $system, $module]);

        $wasSop = $gameDatum->type === GameDataType::Sop;

        DB::transaction(function () use ($gameDatum, $request, $module, $wasSop, $removeModuleFromMembershipConfigs): void {
            $gameDatum->update($request->validated());

            if ($wasSop && $gameDatum->type !== GameDataType::Sop && ! $module->gameData()->where('type', GameDataType::Sop)->exists()) {
                $removeModuleFromMembershipConfigs->clearSopSelections($module);
            }
        });

        /** @var User $user */
        $user = Auth::user();

        ModuleDraftChange::query()->create([
            'module_id' => $module->id,
            'module_version_id' => null,
            'entity_type' => 'game_datum',
            'entity_id' => $gameDatum->id,
            'change_type' => 'update',
            'description' => null,
            'content_after' => ['content' => $gameDatum->content],
            'changed_by' => $user->id,
            'changed_at' => now(),
        ]);

        return new GameDatumResource($gameDatum);
    }

    /**
     * Remove the specified game datum.
     */
    public function destroy(
        System $system,
        Module $module,
        GameDatum $gameDatum,
        RemoveModuleFromMembershipConfigs $removeModuleFromMembershipConfigs,
    ): Response {
        Gate::authorize('delete', [GameDatum::class, $system, $module]);

        DB::transaction(function () use ($gameDatum, $module, $removeModuleFromMembershipConfigs): void {
            $wasSop = $gameDatum->type === GameDataType::Sop;
            $gameDatum->delete();

            if ($wasSop && ! $module->gameData()->where('type', GameDataType::Sop)->exists()) {
                $removeModuleFromMembershipConfigs->clearSopSelections($module);
            }
        });

        return response()->noContent();
    }
}
