<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

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
            'description' => ['nullable', 'string'],
            'config' => ['nullable', 'array'],
            'config.toc_depth' => ['nullable', 'integer', 'min:1'],
            'config.cover_image' => ['nullable', 'string', 'url'],
            'config.sort_rules_by' => ['nullable', 'string', 'in:number,sort_order'],
            'config.require_core_subscription' => ['nullable', 'boolean'],
            'config.allow_concurrent_expansions' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $rc = $this->boolean('config.require_core_subscription');
                $ce = $this->boolean('config.allow_concurrent_expansions');

                if (! $rc && $ce) {
                    $validator->errors()->add(
                        'config.allow_concurrent_expansions',
                        'Concurrent expansions cannot be enabled when require_core_subscription is false.'
                    );
                }
            },
        ];
    }
}
