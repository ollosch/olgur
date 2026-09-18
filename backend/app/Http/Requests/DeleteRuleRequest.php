<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\RuleDeletionMode;
use App\Http\Requests\Concerns\ClassifiesDraftChange;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class DeleteRuleRequest extends FormRequest
{
    use ClassifiesDraftChange;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'mode' => ['sometimes', Rule::enum(RuleDeletionMode::class)],
            'classification' => $this->draftClassificationRule(),
        ];
    }

    public function mode(): RuleDeletionMode
    {
        /** @var string $mode */
        $mode = $this->validated('mode') ?? RuleDeletionMode::ReParent->value;

        return RuleDeletionMode::from($mode);
    }
}
