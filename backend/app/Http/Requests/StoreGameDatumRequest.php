<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\GameDataType;
use App\Models\Module;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreGameDatumRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Module $module */
        $module = $this->route('module');

        return [
            'type' => ['required', Rule::enum(GameDataType::class)],
            'slug' => ['required', 'string', Rule::unique('game_data', 'slug')->where('module_id', $module->id)->where('type', $this->input('type'))],
            'name' => ['required', 'string', 'max:255'],
            'content' => ['required', 'array'],
        ];
    }
}
