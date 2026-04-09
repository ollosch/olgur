<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreRuleRequest;
use App\Http\Requests\UpdateRuleRequest;
use App\Http\Resources\RuleResource;
use App\Models\Module;
use App\Models\Rule;
use App\Models\System;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class RuleController
{
    /**
     * Display a listing of rules for the given module.
     */
    public function index(System $system, Module $module): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Rule::class);

        return RuleResource::collection($module->rules()->orderBy('sort_order')->get());
    }

    /**
     * Store a newly created rule within the given module.
     */
    public function store(StoreRuleRequest $request, System $system, Module $module): RuleResource
    {
        Gate::authorize('create', Rule::class);

        $rule = $module->rules()->create($request->validated());

        return new RuleResource($rule);
    }

    /**
     * Display the specified rule.
     */
    public function show(System $system, Module $module, Rule $rule): RuleResource
    {
        Gate::authorize('view', $rule);

        return new RuleResource($rule);
    }

    /**
     * Update the specified rule.
     */
    public function update(UpdateRuleRequest $request, System $system, Module $module, Rule $rule): RuleResource
    {
        Gate::authorize('update', $rule);

        $rule->update($request->validated());

        return new RuleResource($rule);
    }

    /**
     * Remove the specified rule.
     */
    public function destroy(System $system, Module $module, Rule $rule): Response
    {
        Gate::authorize('delete', $rule);

        $rule->delete();

        return response()->noContent();
    }
}
