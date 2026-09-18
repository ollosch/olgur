<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Module;
use App\Models\Rule as RuleModel;
use App\Models\System;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class RenumberRuleRequest extends FormRequest
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

        /** @var RuleModel $rule */
        $rule = $this->route('rule');

        return [
            'number' => ['required', 'string', Rule::unique('rules', 'number')->where('module_id', $module->id)->ignore($rule)],
            'confirm' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var Module $module */
                $module = $this->route('module');

                /** @var System $system */
                $system = $this->route('system');

                $hasGlobalRuleNumbers = $system->config?->hasGlobalRuleNumbers() ?? false;

                if (! $hasGlobalRuleNumbers) {
                    return;
                }

                $siblingModuleIds = Module::query()
                    ->where('system_id', $system->id)
                    ->whereKeyNot($module->id)
                    ->pluck('id');

                $exists = RuleModel::query()
                    ->whereIn('module_id', $siblingModuleIds)
                    ->where('number', $this->input('number'))
                    ->exists();

                if ($exists) {
                    $validator->errors()->add(
                        'number',
                        'This rule number already exists in another module of this system.'
                    );
                }
            },
        ];
    }

    public function newNumber(): string
    {
        /** @var string $number */
        $number = $this->validated('number');

        return $number;
    }

    public function confirm(): bool
    {
        return $this->boolean('confirm');
    }
}
