<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreModuleVersionAmendmentRequest extends FormRequest
{
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
        return [
            'entity_type' => ['required', 'string', Rule::in(['rule', 'index_entry', 'game_datum'])],
            'entity_id' => ['required', 'string'],
            'change_type' => ['required', 'string', Rule::in(['correction', 'update'])],
            'description' => ['required', 'string', 'min:1'],
            'content' => ['required', 'array'],
        ];
    }
}
