<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesProofreadEntity;
use Illuminate\Foundation\Http\FormRequest;

final class StoreProofreadRequest extends FormRequest
{
    use ResolvesProofreadEntity;

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
