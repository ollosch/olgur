<?php

declare(strict_types=1);

namespace App\Http\Requests\Concerns;

use App\Enums\ModuleTool;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait ValidatesModuleToolDeclarations
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    private function moduleToolDeclarationRules(): array
    {
        return [
            'config.tools' => ['sometimes', 'array'],
            'config.tools.*' => ['array'],
            'config.tools.*.key' => ['required', 'string', Rule::enum(ModuleTool::class)],
            'config.tools.*.config' => ['sometimes', 'array'],
        ];
    }
}
