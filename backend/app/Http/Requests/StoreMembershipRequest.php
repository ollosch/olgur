<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\System;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreMembershipRequest extends FormRequest
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
        /** @var System $system */
        $system = $this->route('system');

        return [
            'user_id' => ['sometimes', 'string', 'exists:users,id', Rule::unique('memberships', 'user_id')->where('system_id', $system->id)],
            'admin' => ['exclude_without:user_id', 'boolean'],
            'config' => ['sometimes', 'nullable', 'array'],
        ];
    }
}
