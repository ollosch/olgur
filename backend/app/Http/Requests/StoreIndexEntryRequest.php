<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Module;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreIndexEntryRequest extends FormRequest
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
            'parent_id' => ['nullable', 'string', Rule::exists('index_entries', 'id')->where('module_id', $module->id)],
            'term' => ['required', 'string'],
            'expansion' => ['nullable', 'string'],
            'definition' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'rule_refs' => ['nullable', 'array'],
            'rule_refs.*' => ['string'],
            'see_also' => ['nullable', 'array'],
            'see_also.*' => ['string'],
        ];
    }
}
