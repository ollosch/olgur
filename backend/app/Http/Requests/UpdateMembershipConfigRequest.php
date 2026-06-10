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
            'config.preferred_rule_format' => ['sometimes', 'string', 'in:content,markdown'],
            'config.active_module_ids' => ['sometimes', 'array'],
            'config.active_module_ids.*' => ['string'],
            'config.bookmarks' => ['sometimes', 'array'],
            'config.bookmarks.*.type' => ['required_with:config.bookmarks', 'string', 'in:rule'],
            'config.bookmarks.*.id' => ['required_with:config.bookmarks', 'string', 'max:26'],
            'config.ignored_tags' => ['sometimes', 'array'],
            'config.ignored_tags.*' => ['string'],
        ];
    }
}
