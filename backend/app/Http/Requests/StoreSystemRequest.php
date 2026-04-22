<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreSystemRequest extends FormRequest
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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'slug' => ['required', 'string', 'max:255', 'unique:systems,slug', 'alpha_dash'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['present', 'string'],
            'config' => ['required', 'array'],
            'config.toc_depth' => ['required', 'integer', 'min:1'],
            'config.cover_image' => ['nullable', 'string', 'url'],
            'config.sort_rules_by' => ['required', 'string', 'in:number,sort_order'],
            'config.system_structure' => ['required', 'string', Rule::in(['core_plus_one', 'core_plus_many', 'grouping_only'])],
        ];
    }
}
