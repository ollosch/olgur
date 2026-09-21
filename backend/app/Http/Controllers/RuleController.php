<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\DeleteRule;
use App\Actions\RecordDraftChange;
use App\Http\Requests\DeleteRuleRequest;
use App\Http\Requests\StoreRuleRequest;
use App\Http\Requests\UpdateRuleRequest;
use App\Http\Resources\RuleResource;
use App\Models\Module;
use App\Models\Rule;
use App\Models\System;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

final class RuleController
{
    /**
     * Display a listing of rules for the given module.
     */
    public function index(System $system, Module $module): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [Rule::class, $system, $module]);

        return RuleResource::collection(
            $module->rules()->with('module')->orderBy('sort_order')->get()
        );
    }

    /**
     * Store a newly created rule within the given module.
     */
    public function store(StoreRuleRequest $request, System $system, Module $module, RecordDraftChange $recordDraftChange): RuleResource
    {
        Gate::authorize('create', [Rule::class, $system, $module]);

        $validated = $request->validated();

        $classification = $request->draftClassification();

        unset($validated['classification']);

        /** @var User $user */
        $user = Auth::user();

        $rule = DB::transaction(function () use ($module, $validated, $recordDraftChange, $user, $classification): Rule {
            $rule = $module->rules()->create($validated);

            $recordDraftChange->execute(
                $module,
                $user,
                'rule',
                $rule->id,
                'create',
                $classification,
                null,
                $recordDraftChange->snapshotRule($rule),
            );

            return $rule;
        });

        return new RuleResource($rule);
    }

    /**
     * Display the specified rule.
     */
    public function show(System $system, Module $module, Rule $rule): RuleResource
    {
        Gate::authorize('view', [Rule::class, $system, $module]);

        $rule->setRelation('module', $module);

        return new RuleResource($rule);
    }

    /**
     * Update the specified rule.
     */
    public function update(UpdateRuleRequest $request, System $system, Module $module, Rule $rule, RecordDraftChange $recordDraftChange): RuleResource
    {
        Gate::authorize('update', [Rule::class, $system, $module]);

        $validated = $request->validated();

        $classification = $request->draftClassification();

        unset($validated['classification']);

        /** @var User $user */
        $user = Auth::user();

        DB::transaction(function () use ($module, $validated, $recordDraftChange, $user, $classification, $rule): void {
            $before = $recordDraftChange->snapshotRule($rule);

            $rule->update($validated);

            $recordDraftChange->execute(
                $module,
                $user,
                'rule',
                $rule->id,
                'update',
                $classification,
                $before,
                $recordDraftChange->snapshotRule($rule),
            );
        });

        return new RuleResource($rule);
    }

    /**
     * Remove the specified rule.
     *
     * A `mode` payload of `recursive` removes the rule's entire subtree; the
     * default `re_parent` mode moves direct children up to the deleted rule's
     * parent instead.
     */
    public function destroy(
        DeleteRuleRequest $request,
        System $system,
        Module $module,
        Rule $rule,
        DeleteRule $deleteRule,
        RecordDraftChange $recordDraftChange,
    ): Response {
        Gate::authorize('delete', [Rule::class, $system, $module]);

        /** @var User $user */
        $user = Auth::user();
        $classification = $request->draftClassification();
        $mode = $request->mode();

        DB::transaction(function () use ($module, $user, $rule, $deleteRule, $recordDraftChange, $classification, $mode): void {
            $deleteRule->execute($module, $rule, $mode, $user, $classification, $recordDraftChange);
        });

        return response()->noContent();
    }
}
