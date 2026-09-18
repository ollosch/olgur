<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\RecordDraftChange;
use App\Http\Requests\ClassifyDraftChangeRequest;
use App\Http\Requests\StoreGameDatumRequest;
use App\Http\Requests\UpdateGameDatumRequest;
use App\Http\Resources\GameDatumResource;
use App\Models\GameDatum;
use App\Models\Module;
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
    public function store(StoreGameDatumRequest $request, System $system, Module $module, RecordDraftChange $recordDraftChange): GameDatumResource
    {
        Gate::authorize('create', [GameDatum::class, $system, $module]);

        $validated = $request->validated();

        $classification = $request->draftClassification();

        unset($validated['classification']);

        /** @var User $user */
        $user = Auth::user();

        $gameDatum = DB::transaction(function () use ($module, $validated, $recordDraftChange, $user, $classification): GameDatum {
            $gameDatum = $module->gameData()->create($validated);

            $recordDraftChange->execute(
                $module,
                $user,
                'game_datum',
                $gameDatum->id,
                'create',
                $classification,
                null,
                $recordDraftChange->snapshotGameDatum($gameDatum),
            );

            return $gameDatum;
        });

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
        RecordDraftChange $recordDraftChange,
    ): GameDatumResource {
        Gate::authorize('update', [GameDatum::class, $system, $module]);

        $validated = $request->validated();

        $classification = $request->draftClassification();

        unset($validated['classification']);

        /** @var User $user */
        $user = Auth::user();

        DB::transaction(function () use ($gameDatum, $validated, $module, $recordDraftChange, $user, $classification): void {
            $before = $recordDraftChange->snapshotGameDatum($gameDatum);

            $gameDatum->update($validated);

            $recordDraftChange->execute(
                $module,
                $user,
                'game_datum',
                $gameDatum->id,
                'update',
                $classification,
                $before,
                $recordDraftChange->snapshotGameDatum($gameDatum),
            );
        });

        return new GameDatumResource($gameDatum);
    }

    /**
     * Remove the specified game datum.
     */
    public function destroy(
        ClassifyDraftChangeRequest $request,
        System $system,
        Module $module,
        GameDatum $gameDatum,
        RecordDraftChange $recordDraftChange,
    ): Response {
        Gate::authorize('delete', [GameDatum::class, $system, $module]);

        /** @var User $user */
        $user = Auth::user();
        $classification = $request->draftClassification();

        DB::transaction(function () use ($gameDatum, $module, $recordDraftChange, $user, $classification): void {
            $before = $recordDraftChange->snapshotGameDatum($gameDatum);

            $gameDatum->delete();

            $recordDraftChange->execute(
                $module,
                $user,
                'game_datum',
                $gameDatum->id,
                'delete',
                $classification,
                $before,
                null,
            );
        });

        return response()->noContent();
    }
}
