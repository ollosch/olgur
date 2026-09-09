<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\ModuleTool;

/**
 * A single declarative tool entry a module exposes to the frontend.
 *
 * The key is a stable identifier the frontend maps to a deployed
 * implementation; the config is arbitrary JSON consumed by that
 * implementation. Neither field may carry Vue component names or
 * user-authored executable code.
 */
final readonly class ModuleToolDeclaration
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(
        public ModuleTool $key,
        public array $config,
    ) {}

    /**
     * @return array{key: string, config: array<string, mixed>}
     */
    public function toArray(): array
    {
        return [
            'key' => $this->key->value,
            'config' => $this->config,
        ];
    }
}
