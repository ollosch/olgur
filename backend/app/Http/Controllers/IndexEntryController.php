<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\RecordDraftChange;
use App\Enums\DraftChangeClassification;
use App\Http\Requests\StoreIndexEntryRequest;
use App\Http\Requests\UpdateIndexEntryRequest;
use App\Http\Resources\IndexEntryResource;
use App\Models\IndexEntry;
use App\Models\Module;
use App\Models\System;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

final class IndexEntryController
{
    /**
     * Display a listing of index entries for the given module.
     */
    public function index(System $system, Module $module): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [IndexEntry::class, $system, $module]);

        return IndexEntryResource::collection($module->indexEntries()->orderBy('term')->get());
    }

    /**
     * Store a newly created index entry within the given module.
     */
    public function store(StoreIndexEntryRequest $request, System $system, Module $module, RecordDraftChange $recordDraftChange): IndexEntryResource
    {
        Gate::authorize('create', [IndexEntry::class, $system, $module]);

        $validated = $request->validated();

        $classification = $request->draftClassification();

        unset($validated['classification']);

        /** @var User $user */
        $user = Auth::user();

        $indexEntry = DB::transaction(function () use ($module, $validated, $recordDraftChange, $user, $classification): IndexEntry {
            $indexEntry = $module->indexEntries()->create($validated);

            $recordDraftChange->execute(
                $module,
                $user,
                'index_entry',
                $indexEntry->id,
                'create',
                $classification,
                null,
                $recordDraftChange->snapshotIndexEntry($indexEntry),
            );

            return $indexEntry;
        });

        return new IndexEntryResource($indexEntry);
    }

    /**
     * Display the specified index entry.
     */
    public function show(System $system, Module $module, IndexEntry $indexEntry): IndexEntryResource
    {
        Gate::authorize('view', [IndexEntry::class, $system, $module]);

        return new IndexEntryResource($indexEntry);
    }

    /**
     * Update the specified index entry.
     */
    public function update(UpdateIndexEntryRequest $request, System $system, Module $module, IndexEntry $indexEntry, RecordDraftChange $recordDraftChange): IndexEntryResource
    {
        Gate::authorize('update', [IndexEntry::class, $system, $module]);

        $validated = $request->validated();

        $classification = $request->draftClassification();

        unset($validated['classification']);

        /** @var User $user */
        $user = Auth::user();

        DB::transaction(function () use ($module, $validated, $recordDraftChange, $user, $classification, $indexEntry): void {
            $before = $recordDraftChange->snapshotIndexEntry($indexEntry);

            $indexEntry->update($validated);

            $recordDraftChange->execute(
                $module,
                $user,
                'index_entry',
                $indexEntry->id,
                'update',
                $classification,
                $before,
                $recordDraftChange->snapshotIndexEntry($indexEntry),
            );
        });

        return new IndexEntryResource($indexEntry);
    }

    /**
     * Remove the specified index entry.
     */
    public function destroy(System $system, Module $module, IndexEntry $indexEntry, RecordDraftChange $recordDraftChange): Response
    {
        Gate::authorize('delete', [IndexEntry::class, $system, $module]);

        /** @var User $user */
        $user = Auth::user();

        DB::transaction(function () use ($module, $user, $indexEntry, $recordDraftChange): void {
            $before = $recordDraftChange->snapshotIndexEntry($indexEntry);

            $indexEntry->delete();

            $recordDraftChange->execute(
                $module,
                $user,
                'index_entry',
                $indexEntry->id,
                'delete',
                DraftChangeClassification::Semantic,
                $before,
                null,
            );
        });

        return response()->noContent();
    }
}
