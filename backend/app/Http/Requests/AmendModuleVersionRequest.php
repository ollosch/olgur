<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class AmendModuleVersionRequest extends FormRequest
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
            'expected_revision' => ['required', 'integer', 'min:0'],
            'content' => ['required', 'array'],
        ];
    }

    /**
     * Reject content that would not update a permitted reader-facing field.
     *
     * @return array<callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $allowedFields = match ($this->input('entity_type')) {
                'rule', 'game_datum' => ['content'],
                'index_entry' => ['definition', 'notes'],
                default => [],
            };

            if (array_intersect(array_keys((array) $this->input('content')), $allowedFields) === []) {
                $validator->errors()->add('content', 'Provide at least one editable content field.');
            }
        }];
    }
}
