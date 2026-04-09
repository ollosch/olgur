<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Module;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateRuleRequest extends FormRequest
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
        /** @var Module $module */
        $module = $this->route('module');

        /** @var \App\Models\Rule $rule */
        $rule = $this->route('rule');

        return [
            'parent_id' => ['sometimes', 'nullable', 'string', Rule::exists('rules', 'id')->where('module_id', $module->id)],
            'number' => ['sometimes', 'string', Rule::unique('rules', 'number')->where('module_id', $module->id)->ignore($rule)],
            'title' => ['sometimes', 'string'],
            'content' => ['sometimes', 'nullable', 'string'],
            'sort_order' => ['sometimes', 'nullable', 'integer'],
        ];
    }
}
