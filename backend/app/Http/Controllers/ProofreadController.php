<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\DeleteProofreadRequest;
use App\Http\Requests\StoreProofreadRequest;
use App\Models\Module;
use App\Models\Proofread;
use App\Models\System;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

final class ProofreadController
{
    /**
     * Return the proofread status map for the system.
     */
    public function index(System $system): JsonResponse
    {
        Gate::authorize('viewAny', [Proofread::class, $system]);

        /** @var User $user */
        $user = Auth::user();

        return response()->json([
            'data' => $this->status($system, $user),
        ]);
    }

    /**
     * Record the current user's proofread of an entity (idempotent).
     */
    public function store(StoreProofreadRequest $request, System $system): JsonResponse
    {
        $validated = $request->validated();

        $entity = $request->resolvedEntity();

        /** @var Module $module */
        $module = $entity->module()->firstOrFail();

        Gate::authorize('create', [Proofread::class, $system, $module]);

        /** @var User $user */
        $user = $request->user();

        Proofread::query()->firstOrCreate([
            'user_id' => $user->id,
            'system_id' => $system->id,
            'entity_type' => $validated['entity_type'],
            'entity_id' => $validated['entity_id'],
        ]);

        return response()->json([
            'data' => $this->status($system, $user),
        ], 201);
    }

    /**
     * Remove the current user's proofread of an entity.
     */
    public function destroy(
        DeleteProofreadRequest $request,
        System $system,
        string $entityType,
        string $entityId,
    ): Response {
        $request->validated();

        $entity = $request->resolvedEntity();

        /** @var Module $module */
        $module = $entity->module()->firstOrFail();

        /** @var User $user */
        $user = $request->user();

        $proofread = Proofread::query()
            ->where('system_id', $system->id)
            ->where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->where('user_id', $user->id)
            ->firstOrFail();

        Gate::authorize('delete', [Proofread::class, $proofread, $system, $module]);

        $proofread->delete();

        return response()->noContent();
    }

    /**
     * @return array{threshold: int, proofreads: array<int|string, array{count: int, me: bool}>}
     */
    private function status(System $system, User $user): array
    {
        $proofreads = Proofread::query()
            ->where('system_id', $system->id)
            ->get(['user_id', 'entity_id']);

        $mine = $proofreads->where('user_id', $user->id)->pluck('entity_id');

        $statuses = [];

        foreach ($proofreads->groupBy('entity_id') as $entityId => $rows) {
            $statuses[$entityId] = [
                'count' => $rows->pluck('user_id')->unique()->count(),
                'me' => $mine->contains($entityId),
            ];
        }

        return [
            'threshold' => $system->config?->proofreadThreshold() ?? 3,
            'proofreads' => $statuses,
        ];
    }
}
