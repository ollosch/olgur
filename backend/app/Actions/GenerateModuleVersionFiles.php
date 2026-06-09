<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\GameDatumVersion;
use App\Models\IndexEntryVersion;
use App\Models\ModuleVersion;
use App\Models\RuleVersion;
use Illuminate\Support\Facades\Storage;

final class GenerateModuleVersionFiles
{
    public function generateRules(ModuleVersion $version): void
    {
        $rules = RuleVersion::query()
            ->where('module_version_id', $version->id)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (RuleVersion $rv): array => [
                'id' => $rv->id,
                'rule_id' => $rv->rule_id,
                'module_version_id' => $rv->module_version_id,
                'parent_id' => $rv->parent_id,
                'number' => $rv->number,
                'title' => $rv->title,
                'content' => $rv->content,
                'sort_order' => $rv->sort_order,
            ])
            ->all();

        Storage::disk('local')->put(
            sprintf('versions/%s/rules.json', $version->id),
            (string) json_encode($rules, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );
    }

    public function generateIndex(ModuleVersion $version): void
    {
        $indexEntries = IndexEntryVersion::query()
            ->where('module_version_id', $version->id)
            ->orderBy('term')
            ->get()
            ->map(fn (IndexEntryVersion $iev): array => [
                'id' => $iev->id,
                'index_entry_id' => $iev->index_entry_id,
                'module_version_id' => $iev->module_version_id,
                'parent_id' => $iev->parent_id,
                'term' => $iev->term,
                'definition' => $iev->definition,
                'notes' => $iev->notes,
                'relations' => $iev->relations,
            ])
            ->all();

        Storage::disk('local')->put(
            sprintf('versions/%s/index.json', $version->id),
            (string) json_encode($indexEntries, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );
    }

    public function generateGameData(ModuleVersion $version): void
    {
        $gameData = GameDatumVersion::query()
            ->where('module_version_id', $version->id)
            ->get()
            ->map(fn (GameDatumVersion $gdv): array => [
                'id' => $gdv->id,
                'game_datum_id' => $gdv->game_datum_id,
                'module_version_id' => $gdv->module_version_id,
                'type' => $gdv->type->value,
                'name' => $gdv->name,
                'slug' => $gdv->slug,
                'content' => $gdv->content,
            ])
            ->all();

        Storage::disk('local')->put(
            sprintf('versions/%s/game-data.json', $version->id),
            (string) json_encode($gameData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );
    }

    public function generateAll(ModuleVersion $version): void
    {
        $this->generateRules($version);
        $this->generateIndex($version);
        $this->generateGameData($version);
    }
}
