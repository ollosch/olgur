<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ClassifiesDraftChange;
use Illuminate\Foundation\Http\FormRequest;

final class ClassifyDraftChangeRequest extends FormRequest
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
        return ['classification' => $this->draftClassificationRule()];
    }
}
