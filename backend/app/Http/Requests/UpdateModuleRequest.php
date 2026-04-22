<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Module;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateModuleRequest extends FormRequest
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

        return [
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', Rule::unique('modules', 'slug')->where('system_id', $module->system_id)->ignore($module)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['present', 'string'],
            'config' => ['present', 'array'],
            'is_core' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
        ];
    }
}
