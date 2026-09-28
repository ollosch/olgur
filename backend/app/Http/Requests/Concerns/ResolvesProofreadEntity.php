<?php

declare(strict_types=1);

namespace App\Http\Requests\Concerns;

use App\Models\GameDatum;
use App\Models\IndexEntry;
use App\Models\Proofread;
use App\Models\Rule as RuleModel;
use App\Models\System;
use App\Models\User;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Shared validation for the polymorphic proofread target ({entity_type, entity_id}).
 */
trait ResolvesProofreadEntity
{
    /**
     * Validation rules for the proofread target.
     *
     * @return array<string, mixed>
     */
    public function proofreadEntityRules(): array
    {
        return [
            'entity_type' => ['required', Rule::in(Proofread::ENTITY_TYPES)],
            'entity_id' => ['required', 'string', 'ulid'],
        ];
    }

    /**
     * Post-validation checks that the target resolves to an entity the user can view.
     *
     * @return array<int, callable>
     */
    public function proofreadEntityAfter(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                /** @var System $system */
                $system = $this->route('system');

                /** @var User $user */
                $user = $this->user();

                $entity = Proofread::resolveEntity(
                    $this->string('entity_type')->toString(),
                    $this->string('entity_id')->toString(),
                );

                if ($entity === null) {
                    $validator->errors()->add('entity_id', 'The selected entity does not exist.');

                    return;
                }

                $module = $entity->module()->first();

                if ($module === null || $module->system_id !== $system->id) {
                    $validator->errors()->add('entity_id', 'The selected entity does not belong to this system.');

                    return;
                }

                if (! $module->isSubscriber($user) && ! $system->isAdmin($user) && ! $user->super_admin) {
                    $validator->errors()->add('entity_id', 'You do not have access to this entity.');
                }
            },
        ];
    }

    /**
     * Resolve the validated proofread target entity.
     */
    public function resolvedEntity(): RuleModel|IndexEntry|GameDatum
    {
        $entity = Proofread::resolveEntity(
            $this->string('entity_type')->toString(),
            $this->string('entity_id')->toString(),
        );

        throw_if($entity === null, NotFoundHttpException::class, 'The requested entity could not be found.');

        return $entity;
    }
}
