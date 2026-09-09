<?php

declare(strict_types=1);

namespace App\Http\Requests\Concerns;

use App\Enums\DraftChangeClassification;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

trait ClassifiesDraftChange
{
    /**
     * The validation rule for an optional semantic/typo classification.
     *
     * @return array{0: string, 1: Enum}
     */
    public function draftClassificationRule(): array
    {
        return ['sometimes', Rule::enum(DraftChangeClassification::class)];
    }

    /**
     * Resolve the submitted draft classification, defaulting to semantic.
     */
    public function draftClassification(): DraftChangeClassification
    {
        /** @var string $classification */
        $classification = $this->validated('classification') ?? DraftChangeClassification::Semantic->value;

        return DraftChangeClassification::from($classification);
    }
}
