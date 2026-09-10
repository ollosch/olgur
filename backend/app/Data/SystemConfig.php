<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\SystemStructure;
use Illuminate\Contracts\Database\Eloquent\Castable;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * Value object representing a System's config JSON column.
 *
 * Immutable fields (set at creation only, silently ignored on update):
 *   - $structure
 *   - $sortRulesBy
 *
 * Mutable fields:
 *   - $tocDepth
 *   - $coverImage
 *
 * @see \App\Models\System::$config
 * @see \App\Http\Requests\StoreSystemRequest
 * @see \App\Http\Requests\UpdateSystemRequest
 */
final readonly class SystemConfig implements Castable
{
    public function __construct(
        /**
         * Immutable — determines how subscriptions and rule-number uniqueness work.
         *
         * @see SystemStructure
         */
        public SystemStructure $structure,
        /** Display ordering preference for rules. Immutable after creation. */
        public string $sortRulesBy,
        /** Table-of-contents depth hint (display only). */
        public int $tocDepth,
        /** Cover image URL (display only). */
        public ?string $coverImage,
    ) {}

    /**
     * Construct from a raw array (e.g. decoded from JSON or request input).
     * Missing keys fall back to safe defaults so partial arrays are tolerated.
     *
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        $structureValue = is_string($data['system_structure'] ?? null) ? $data['system_structure'] : null;

        return new self(
            structure: $structureValue !== null ? (SystemStructure::tryFrom($structureValue) ?? SystemStructure::GroupingOnly) : SystemStructure::GroupingOnly,
            sortRulesBy: is_string($data['sort_rules_by'] ?? null) ? $data['sort_rules_by'] : 'sort_order',
            tocDepth: is_int($data['toc_depth'] ?? null) ? $data['toc_depth'] : 1,
            coverImage: is_string($data['cover_image'] ?? null) ? $data['cover_image'] : null,
        );
    }

    /**
     * @param  array<array-key, mixed>  $arguments
     * @return CastsAttributes<self|null, self|array<string, mixed>|null>
     */
    public static function castUsing(array $arguments): CastsAttributes
    {
        return new class implements CastsAttributes
        {
            /**
             * @param  array<string, mixed>  $attributes
             */
            public function get(Model $model, string $key, mixed $value, array $attributes): ?SystemConfig
            {
                if ($value === null) {
                    return null;
                }

                /** @var array<string, mixed> $data */
                $data = json_decode(is_string($value) ? $value : '', true) ?? [];

                return SystemConfig::fromArray($data);
            }

            /**
             * @param  array<string, mixed>  $attributes
             * @param  SystemConfig|array<string, mixed>|null  $value
             */
            public function set(Model $model, string $key, mixed $value, array $attributes): ?string
            {
                if ($value === null) {
                    return null;
                }

                if (is_array($value)) {
                    $value = SystemConfig::fromArray($value);
                }

                return json_encode($value->toArray()) ?: null;
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
            'system_structure' => $this->structure->value,
            'sort_rules_by' => $this->sortRulesBy,
            'toc_depth' => $this->tocDepth,
            'cover_image' => $this->coverImage,
        ];
    }

    /**
     * Whether rule numbers must be unique across all modules in the system.
     *
     * True only when the structure is CorePlusMany, whose rule trees merge.
     *
     * No separate config flag is needed — the behaviour is fully derived.
     */
    public function enforceSystemWideRuleNumbers(): bool
    {
        return $this->structure === SystemStructure::CorePlusMany;
    }
}
