<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Module;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateIndexEntryRequest extends FormRequest
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

        /** @var \App\Models\IndexEntry $indexEntry */
        $indexEntry = $this->route('indexEntry');

        return [
            'parent_id' => ['sometimes', 'nullable', 'string', Rule::exists('index_entries', 'id')->where('module_id', $module->id)],
            'term' => ['required', 'string', Rule::unique('index_entries', 'term')->where('module_id', $module->id)->ignore()],
            'definition' => ['sometimes', 'nullable', 'string'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'relations.rule_refs' => ['nullable', 'array'],
            'relations.rule_refs.*' => ['string'],
            'relations.see_also' => ['nullable', 'array'],
            'relations.see_also.*' => ['string'],
        ];
    }
}
