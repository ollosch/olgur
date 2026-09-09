<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\GameDataType;
use App\Http\Requests\Concerns\ClassifiesDraftChange;
use App\Models\GameDatum;
use App\Models\Module;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateGameDatumRequest extends FormRequest
{
    use ClassifiesDraftChange;

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

        /** @var GameDatum $gameDatum */
        $gameDatum = $this->route('game_datum');

        return [
            'type' => ['sometimes', Rule::enum(GameDataType::class)],
            'slug' => [
                'sometimes',
                'string',
                Rule::unique('game_data', 'slug')
                    ->where('module_id', $module->id)
                    ->where('type', $this->string('type')->toString())
                    ->ignore($gameDatum->id)],
            'name' => ['sometimes', 'string', 'max:255'],
            'content' => ['sometimes', 'array'],
            'classification' => $this->draftClassificationRule(),
        ];
    }
}
