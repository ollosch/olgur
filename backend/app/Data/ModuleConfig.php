<?php

declare(strict_types=1);

namespace App\Data;

use Illuminate\Contracts\Database\Eloquent\Castable;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * Value object representing a Module's config JSON column.
 *
 * Arbitrary config is retained without interpretation.
 *
 * @see \App\Models\Module::$config
 * @see \App\Http\Requests\StoreModuleRequest
 * @see \App\Http\Requests\UpdateModuleRequest
 */
final readonly class ModuleConfig implements Castable
{
    /**
     * @param  array<string, mixed>  $values
     */
    public function __construct(
        public array $values,
    ) {}

    /**
     * Construct from a raw array (e.g. decoded from JSON or request input).
     *
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(values: $data);
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
        return $this->values;
    }
}
