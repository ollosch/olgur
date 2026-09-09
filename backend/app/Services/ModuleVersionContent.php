<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\GameDatumVersion;
use App\Models\IndexEntryVersion;
use App\Models\ModuleVersion;
use App\Models\RuleVersion;

/**
 * Reads a released version's snapshot tables into the flat array shape the
 * frontend consumes. The payload contains no user-specific data, so it can be
 * cached and shared across authorized readers.
 */
final class ModuleVersionContent
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function rules(ModuleVersion $version): array
    {
        return RuleVersion::query()
            ->where('module_version_id', $version->id)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (RuleVersion $rule): array => [
                'id' => $rule->id,
                'rule_id' => $rule->rule_id,
                'module_version_id' => $rule->module_version_id,
                'parent_id' => $rule->parent_id,
                'number' => $rule->number,
                'title' => $rule->title,
                'content' => $rule->content,
                'sort_order' => $rule->sort_order,
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function index(ModuleVersion $version): array
    {
        return IndexEntryVersion::query()
            ->where('module_version_id', $version->id)
            ->orderBy('term')
            ->get()
            ->map(fn (IndexEntryVersion $entry): array => [
                'id' => $entry->id,
                'index_entry_id' => $entry->index_entry_id,
                'module_version_id' => $entry->module_version_id,
                'parent_id' => $entry->parent_id,
                'term' => $entry->term,
                'definition' => $entry->definition,
                'notes' => $entry->notes,
                'relations' => $entry->relations,
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function gameData(ModuleVersion $version): array
    {
        return GameDatumVersion::query()
            ->where('module_version_id', $version->id)
            ->get()
            ->map(fn (GameDatumVersion $gameDatum): array => [
                'id' => $gameDatum->id,
                'game_datum_id' => $gameDatum->game_datum_id,
                'module_version_id' => $gameDatum->module_version_id,
                'type' => $gameDatum->type->value,
                'name' => $gameDatum->name,
                'slug' => $gameDatum->slug,
                'content' => $gameDatum->content,
            ])
            ->all();
    }
}
