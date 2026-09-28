<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesProofreadEntity;
use Illuminate\Foundation\Http\FormRequest;

final class DeleteProofreadRequest extends FormRequest
{
    use ResolvesProofreadEntity;

    /**
     * The proofread target is carried in the route, not the body.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'entity_type' => $this->route('entity_type'),
            'entity_id' => $this->route('entity_id'),
        ]);
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return $this->proofreadEntityRules();
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return $this->proofreadEntityAfter();
    }
}
