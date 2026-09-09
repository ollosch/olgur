<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\SystemStructure;
use App\Http\Requests\Concerns\ValidatesModuleToolDeclarations;
use App\Models\System;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreModuleRequest extends FormRequest
{
    use ValidatesModuleToolDeclarations;

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
        /** @var System $system */
        $system = $this->route('system');

        return [
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', Rule::unique('modules', 'slug')->where('system_id', $system->id)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['present', 'string'],
            'config' => ['present', 'array'],
            'is_core' => [
                'required',
                'boolean',
                function (string $attribute, mixed $value, Closure $fail) use ($system): void {
                    if (! $value) {
                        return;
                    }

                    if ($system->config?->structure === SystemStructure::GroupingOnly) {
                        $fail('Grouping-only systems cannot have a core module.');

                        return;
                    }

                    if ($system->modules()->where('is_core', true)->exists()) {
                        $fail('This system already has a core module.');
                    }
                },
            ],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
            ...$this->moduleToolDeclarationRules(),
        ];
    }
}
