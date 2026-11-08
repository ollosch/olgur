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
     * @param  array<int, array{type: string, id: string, mode?: string, label?: string, sublabel?: string}>  $bookmarks
     * @param  array<int, string>  $ignoredTags
     * @param  array<int, string>  $boldTags
     */
    public function __construct(
        /** Per-system rule bookmarks stored by the frontend. */
        public array $bookmarks,
        /** Tag slugs ignored in the ASOP view for this user. */
        public array $ignoredTags,
        /** Tag slugs bolded in the ASOP view for this user. */
        public array $boldTags,
        /** Whether acronym popups are enabled for this user. */
        public bool $acronymPopups,
        /** The single module currently selected, or null when all subscribed modules are active. */
        public ?string $selectedModuleId = null,
    ) {}

    /**
     * Construct from a raw array (e.g. decoded from JSON or request input).
     * Missing keys fall back to safe defaults so partial arrays are tolerated.
     *
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        $bookmarks = [];
        if (is_array($data['bookmarks'] ?? null)) {
            foreach ($data['bookmarks'] as $bookmark) {
                if (! is_array($bookmark)) {
                    continue;
                }

                if (! is_string($bookmark['type'] ?? null)) {
                    continue;
                }

                if (! is_string($bookmark['id'] ?? null)) {
                    continue;
                }

                $entry = ['type' => $bookmark['type'], 'id' => $bookmark['id']];

                if (in_array($bookmark['mode'] ?? null, ['draft', 'release'], true)) {
                    $entry['mode'] = $bookmark['mode'];
                }

                if (is_string($bookmark['label'] ?? null)) {
                    $entry['label'] = $bookmark['label'];
                }

                if (is_string($bookmark['sublabel'] ?? null)) {
                    $entry['sublabel'] = $bookmark['sublabel'];
                }

                $bookmarks[] = $entry;
            }
        }

        $ignoredTags = is_array($data['ignored_tags'] ?? null)
            ? array_values(array_filter($data['ignored_tags'], is_string(...)))
            : [];

        $boldTags = is_array($data['bold_tags'] ?? null)
            ? array_values(array_filter($data['bold_tags'], is_string(...)))
            : [];

        $selectedModuleId = is_string($data['selected_module_id'] ?? null)
            ? $data['selected_module_id']
            : null;

        return new self(
            bookmarks: $bookmarks,
            ignoredTags: $ignoredTags,
            boldTags: $boldTags,
            acronymPopups: (bool) ($data['acronym_popups'] ?? false),
            selectedModuleId: $selectedModuleId,
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
            'bookmarks' => $this->bookmarks,
            'ignored_tags' => $this->ignoredTags,
            'bold_tags' => $this->boldTags,
            'acronym_popups' => $this->acronymPopups,
            'selected_module_id' => $this->selectedModuleId,
        ];
    }
}
