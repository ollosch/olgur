<?php

declare(strict_types=1);

namespace App\Data;

use Illuminate\Contracts\Database\Eloquent\Castable;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * Value object representing a Membership's config JSON column.
 *
 * @see \App\Models\Membership::$config
 * @see \App\Http\Requests\UpdateMembershipConfigRequest
 */
final readonly class MembershipConfig implements Castable
{
    /**
     * @param  array<int, string>  $activeModuleIds
     * @param  array<int, array{type: string, id: string}>  $bookmarks
     * @param  array<int, string>  $ignoredTags
     */
    public function __construct(
        /** IDs of expansion modules currently active for this user in this system. */
        public array $activeModuleIds,
        /** Per-system rule bookmarks stored by the frontend. */
        public array $bookmarks,
        /** Tag slugs ignored in the ASOP view for this user. */
        public array $ignoredTags,
        /** Whether acronym popups are enabled for this user. */
        public bool $acronymPopups,
        /** The preferred rule format for this user. */
        public string $preferredRuleFormat,
        /** Active module whose SOP the player selected, when any. */
        public ?string $selectedSopModuleId,
    ) {}

    /**
     * Construct from a raw array (e.g. decoded from JSON or request input).
     * Missing keys fall back to safe defaults so partial arrays are tolerated.
     *
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        $activeModuleIds = is_array($data['active_module_ids'] ?? null)
            ? array_values(array_filter($data['active_module_ids'], is_string(...)))
            : [];

        $bookmarks = [];
        if (is_array($data['bookmarks'] ?? null)) {
            foreach ($data['bookmarks'] as $bookmark) {
                if (is_array($bookmark) && is_string($bookmark['type'] ?? null) && is_string($bookmark['id'] ?? null)) {
                    $bookmarks[] = ['type' => $bookmark['type'], 'id' => $bookmark['id']];
                }
            }
        }

        $ignoredTags = is_array($data['ignored_tags'] ?? null)
            ? array_values(array_filter($data['ignored_tags'], is_string(...)))
            : [];

        $preferredRuleFormat = is_string($data['preferred_rule_format'] ?? null)
            ? $data['preferred_rule_format']
            : 'content';

        $selectedSopModuleId = is_string($data['selected_sop_module_id'] ?? null)
            ? $data['selected_sop_module_id']
            : null;

        return new self(
            activeModuleIds: $activeModuleIds,
            bookmarks: $bookmarks,
            ignoredTags: $ignoredTags,
            acronymPopups: (bool) ($data['acronym_popups'] ?? false),
            preferredRuleFormat: $preferredRuleFormat,
            selectedSopModuleId: $selectedSopModuleId,
        );
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
            public function get(Model $model, string $key, mixed $value, array $attributes): MembershipConfig
            {
                /** @var array<string, mixed> $data */
                $data = json_decode(is_string($value) ? $value : '', true) ?? [];

                return MembershipConfig::fromArray($data);
            }

            /**
             * @param  array<string, mixed>  $attributes
             * @param  MembershipConfig|array<string, mixed>  $value
             */
            public function set(Model $model, string $key, mixed $value, array $attributes): string
            {
                if (is_array($value)) {
                    $value = MembershipConfig::fromArray($value);
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
            'active_module_ids' => $this->activeModuleIds,
            'bookmarks' => $this->bookmarks,
            'ignored_tags' => $this->ignoredTags,
            'acronym_popups' => $this->acronymPopups,
            'preferred_rule_format' => $this->preferredRuleFormat,
            'selected_sop_module_id' => $this->selectedSopModuleId,
        ];
    }
}
