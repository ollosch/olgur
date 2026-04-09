<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreIndexEntryRequest;
use App\Http\Requests\UpdateIndexEntryRequest;
use App\Http\Resources\IndexEntryResource;
use App\Models\IndexEntry;
use App\Models\Module;
use App\Models\System;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class IndexEntryController
{
    /**
     * Display a listing of index entries for the given module.
     */
    public function index(System $system, Module $module): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', IndexEntry::class);

        return IndexEntryResource::collection($module->indexEntries()->orderBy('term')->get());
    }

    /**
     * Store a newly created index entry within the given module.
     */
    public function store(StoreIndexEntryRequest $request, System $system, Module $module): IndexEntryResource
    {
        Gate::authorize('create', IndexEntry::class);

        $indexEntry = $module->indexEntries()->create($request->validated());

        return new IndexEntryResource($indexEntry);
    }

    /**
     * Display the specified index entry.
     */
    public function show(System $system, Module $module, IndexEntry $indexEntry): IndexEntryResource
    {
        Gate::authorize('view', $indexEntry);

        return new IndexEntryResource($indexEntry);
    }

    /**
     * Update the specified index entry.
     */
    public function update(UpdateIndexEntryRequest $request, System $system, Module $module, IndexEntry $indexEntry): IndexEntryResource
    {
        Gate::authorize('update', $indexEntry);

        $indexEntry->update($request->validated());

        return new IndexEntryResource($indexEntry);
    }

    /**
     * Remove the specified index entry.
     */
    public function destroy(System $system, Module $module, IndexEntry $indexEntry): Response
    {
        Gate::authorize('delete', $indexEntry);

        $indexEntry->delete();

        return response()->noContent();
    }
}
