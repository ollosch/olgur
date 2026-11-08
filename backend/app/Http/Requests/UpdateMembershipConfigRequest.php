<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateMembershipConfigRequest extends FormRequest
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
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'config' => ['required', 'array'],
            'config.acronym_popups' => ['sometimes', 'boolean'],
            'config.bookmarks' => ['sometimes', 'array'],
            'config.bookmarks.*.type' => ['required_with:config.bookmarks', 'string', 'in:rule,table,unit'],
            'config.bookmarks.*.id' => ['required_with:config.bookmarks', 'string', 'max:26'],
            'config.bookmarks.*.mode' => ['sometimes', 'string', 'in:draft,release'],
            'config.bookmarks.*.label' => ['sometimes', 'nullable', 'string', 'max:255'],
            'config.bookmarks.*.sublabel' => ['sometimes', 'nullable', 'string', 'max:64'],
            'config.ignored_tags' => ['sometimes', 'array'],
            'config.ignored_tags.*' => ['string'],
            'config.bold_tags' => ['sometimes', 'array'],
            'config.bold_tags.*' => ['string'],
            'config.selected_module_id' => ['sometimes', 'nullable', 'string', 'max:26'],
        ];
    }
}
