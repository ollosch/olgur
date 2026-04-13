<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Module;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class CreateModuleVersionRequest extends FormRequest
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
        $module = $this->route('module');
        $moduleId = $module instanceof Module ? $module->id : null;

        return [
            'version_string' => [
                'required',
                'string',
                Rule::unique('module_versions', 'version_string')->where('module_id', $moduleId)
            ],
            'notes' => ['nullable', 'string'],
        ];
    }
}
