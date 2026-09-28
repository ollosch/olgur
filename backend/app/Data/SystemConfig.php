<?php

declare(strict_types=1);

namespace App\Data;

use Illuminate\Contracts\Database\Eloquent\Castable;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * Value object representing a System's config JSON column.
 *
 * Immutable fields (set at creation only, silently ignored on update):
 *   - $globalRuleNumbers
 *   - $sortRulesBy
 *
 * Mutable fields:
 *   - $tocDepth
 *   - $coverImage
 *   - $proofreadThreshold
 *
 * @see \App\Models\System::$config
 * @see \App\Http\Requests\StoreSystemRequest
 * @see \App\Http\Requests\UpdateSystemRequest
 */
final readonly class SystemConfig implements Castable
{
    public function __construct(
        /** Whether rule numbers are unique across all modules in the system. Immutable after creation. */
        public bool $globalRuleNumbers,
        /** Display ordering preference for rules. Immutable after creation. */
        public string $sortRulesBy,
        /** Table-of-contents depth hint (display only). */
        public int $tocDepth,
        /** Cover image URL (display only). */
        public ?string $coverImage,
        /** Number of distinct proofreaders required before an entity is considered proofread. */
        public int $proofreadThreshold,
    ) {}

    /**
     * Construct from a raw array (e.g. decoded from JSON or request input).
     * Missing keys fall back to safe defaults so partial arrays are tolerated.
     *
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            globalRuleNumbers: (bool) ($data['global_rule_numbers'] ?? false),
            sortRulesBy: is_string($data['sort_rules_by'] ?? null) ? $data['sort_rules_by'] : 'sort_order',
            tocDepth: is_int($data['toc_depth'] ?? null) ? $data['toc_depth'] : 1,
            coverImage: is_string($data['cover_image'] ?? null) ? $data['cover_image'] : null,
            proofreadThreshold: is_int($data['proofread_threshold'] ?? null) ? $data['proofread_threshold'] : 3,
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
            'global_rule_numbers' => $this->globalRuleNumbers,
            'sort_rules_by' => $this->sortRulesBy,
            'toc_depth' => $this->tocDepth,
            'cover_image' => $this->coverImage,
            'proofread_threshold' => $this->proofreadThreshold,
        ];
    }

    /**
     * Whether rule numbers must be unique across all modules in the system.
     */
    public function hasGlobalRuleNumbers(): bool
    {
        return $this->globalRuleNumbers;
    }

    /**
     * Number of distinct proofreaders required before an entity is considered proofread.
     */
    public function proofreadThreshold(): int
    {
        return $this->proofreadThreshold;
    }
}
