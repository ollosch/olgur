<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\ModuleTool;
use Illuminate\Contracts\Database\Eloquent\Castable;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * Value object representing a Module's config JSON column.
 *
 * Arbitrary top-level config is retained. Tool entries are normalized to known
 * declarations, so partial or legacy tool arrays are tolerated without error.
 *
 * @see \App\Models\Module::$config
 * @see \App\Http\Requests\StoreModuleRequest
 * @see \App\Http\Requests\UpdateModuleRequest
 */
final readonly class ModuleConfig implements Castable
{
    /**
     * @param  array<string, mixed>  $values
     * @param  array<int, ModuleToolDeclaration>  $tools
     */
    public function __construct(
        /** Non-tool configuration retained without interpretation. */
        public array $values,
        /** Declarative tool entries this module exposes to the frontend. */
        public array $tools,
    ) {}

    /**
     * Construct from a raw array (e.g. decoded from JSON or request input).
     * Missing keys and unknown tool keys fall back to an empty tool list.
     *
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        $tools = [];

        if (is_array($data['tools'] ?? null)) {
            foreach ($data['tools'] as $tool) {
                if (! is_array($tool)) {
                    continue;
                }

                $key = ModuleTool::tryFrom(is_string($tool['key'] ?? null) ? $tool['key'] : '');

                if ($key === null) {
                    continue;
                }

                /** @var array<string, mixed> $config */
                $config = is_array($tool['config'] ?? null) ? $tool['config'] : [];

                $tools[] = new ModuleToolDeclaration(
                    key: $key,
                    config: $config,
                );
            }
        }

        unset($data['tools']);

        return new self(values: $data, tools: $tools);
    }

    /**
     * @param  array<array-key, mixed>  $arguments
     * @return CastsAttributes<self, self|array<string, mixed>>
     */
    public static function castUsing(array $arguments): CastsAttributes
    {
        return new class implements CastsAttributes
        {
            /**
             * @param  array<string, mixed>  $attributes
             */
            public function get(Model $model, string $key, mixed $value, array $attributes): ModuleConfig
            {
                /** @var array<string, mixed> $data */
                $data = json_decode(is_string($value) ? $value : '', true) ?? [];

                return ModuleConfig::fromArray($data);
            }

            /**
             * @param  array<string, mixed>  $attributes
             * @param  ModuleConfig|array<string, mixed>  $value
             */
            public function set(Model $model, string $key, mixed $value, array $attributes): string
            {
                if (is_array($value)) {
                    $value = ModuleConfig::fromArray($value);
                }

                return json_encode($value->toArray()) ?: '{}';
            }
        };
    }

    /**
     * Serialize back to the array shape stored in the JSON column.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            ...$this->values,
            'tools' => array_map(
                static fn (ModuleToolDeclaration $tool): array => $tool->toArray(),
                $this->tools,
            ),
        ];
    }
}
