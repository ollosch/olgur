<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreIndexEntryRequest;
use App\Http\Requests\UpdateIndexEntryRequest;
use App\Http\Resources\IndexEntryResource;
use App\Models\IndexEntry;
use App\Models\Module;
use App\Models\ModuleDraftChange;
use App\Models\System;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
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
    public function store(StoreIndexEntryRequest $request, System $system, Module $module): IndexEntryResource
    {
        Gate::authorize('create', [IndexEntry::class, $system, $module]);

        $indexEntry = $module->indexEntries()->create($request->validated());

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
    public function update(UpdateIndexEntryRequest $request, System $system, Module $module, IndexEntry $indexEntry): IndexEntryResource
    {
        Gate::authorize('update', [IndexEntry::class, $system, $module]);

        $indexEntry->update($request->validated());

        /** @var User $user */
        $user = Auth::user();

        ModuleDraftChange::query()->create([
            'module_id' => $module->id,
            'module_version_id' => null,
            'entity_type' => 'index_entry',
            'entity_id' => $indexEntry->id,
            'change_type' => 'update',
            'description' => null,
            'content_after' => [
                'definition' => $indexEntry->definition,
                'notes' => $indexEntry->notes,
                'relations' => $indexEntry->relations,
            ],
            'changed_by' => $user->id,
            'changed_at' => now(),
        ]);

        return new IndexEntryResource($indexEntry);
    }

    /**
     * Remove the specified index entry.
     */
    public function destroy(System $system, Module $module, IndexEntry $indexEntry): Response
    {
        Gate::authorize('delete', [IndexEntry::class, $system, $module]);

        $indexEntry->delete();

        return response()->noContent();
    }
}
