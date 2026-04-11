<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Module;
use App\Models\System;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreRuleRequest extends FormRequest
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

        /** @var System $system */
        $system = $this->route('system');

        return [
            'parent_id' => ['nullable', 'string', Rule::exists('rules', 'id')->where('module_id', $module->id)],
            'number' => ['required', 'string', Rule::unique('rules', 'number')->where('system_id', $system->id)],
            'title' => ['required', 'string'],
            'content' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer'],
        ];
    }
}
