<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\IndexEntry;
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

        /** @var IndexEntry $indexEntry */
        $indexEntry = $this->route('indexEntry');

        return [
            'parent_id' => ['nullable', 'string', Rule::exists('index_entries', 'id')->where('module_id', $module->id)],
            'term' => ['required', 'string', Rule::unique('index_entries', 'term')->where('module_id', $module->id)->ignore($indexEntry)],
            'definition' => ['present', 'string'],
            'notes' => ['present', 'string'],
            'relations.rule_refs' => ['present', 'array'],
            'relations.rule_refs.*' => ['string'],
            'relations.see_also' => ['present', 'array'],
            'relations.see_also.*' => ['string'],
        ];
    }
}
