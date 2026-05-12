<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\GameDatum;
use App\Models\GameDatumVersion;
use App\Models\IndexEntry;
use App\Models\IndexEntryVersion;
use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\Rule;
use App\Models\RuleVersion;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\LazyCollection;
use Illuminate\Support\Str;

final class PublishModuleVersion
{
    public function execute(Module $module, User $releasedBy, string $version, string $notes = ''): ModuleVersion
    {
        $version = DB::transaction(function () use ($module, $releasedBy, $version, $notes): ModuleVersion {

            $moduleVersion = ModuleVersion::query()->create([
                'module_id' => $module->id,
                'version_string' => $version,
                'notes' => $notes,
                'released_at' => now(),
                'released_by' => $releasedBy->id,
            ]);

            $this->publishRules($module, $moduleVersion);
            $this->publishIndex($module, $moduleVersion);
            $this->publishGameData($module, $moduleVersion);

            return $moduleVersion;
        });

        $this->generateStaticFiles($version);

        return $version;

    }

    private function publishRules(Module $module, ModuleVersion $version): void
    {
        /** @var array<string, string> $map */
        $map = [];

        $module->rules()->cursor()->each(function (Rule $rule) use (&$map): void {
            $map[$rule->id] = Str::lower((string) Str::ulid());
        });

        $module->rules()->cursor()->map(function (Rule $rule) use (&$map, $version): array {
            return [
                'id' => $map[$rule->id],
                'rule_id' => $rule->id,
                'module_version_id' => $version->id,
                'parent_id' => null,
                'number' => $rule->number,
                'title' => $rule->title,
                'content' => $rule->content,
                'sort_order' => $rule->sort_order,
            ];
        })->chunk(500)->each(fn (LazyCollection $chunk) => RuleVersion::query()->insert($chunk->values()->all()));

        /** @var array<string, string> $parentMap */
        $parentMap = [];

        $module->rules()->cursor()->each(function (Rule $rule) use (&$map, &$parentMap): void {
            if ($rule->parent_id !== null && isset($map[$rule->parent_id])) {
                $parentMap[$map[$rule->id]] = $map[$rule->parent_id];
            }
        });

        if ($parentMap !== []) {
            $table = (new RuleVersion())->getTable();
            $this->bulkUpdateParents($table, $parentMap);
        }
    }

    private function publishIndex(Module $module, ModuleVersion $version): void
    {
        /** @var array<string, string> $map */
        $map = [];

        $module->indexEntries()->cursor()->each(function (IndexEntry $indexEntry) use (&$map): void {
            $map[$indexEntry->id] = Str::lower((string) Str::ulid());
        });

        $module->indexEntries()->cursor()->map(function (IndexEntry $indexEntry) use (&$map, $version): array {
            return [
                'id' => $map[$indexEntry->id],
                'index_entry_id' => $indexEntry->id,
                'module_version_id' => $version->id,
                'parent_id' => null,
                'term' => $indexEntry->term,
                'definition' => $indexEntry->definition,
                'notes' => $indexEntry->notes,
                'relations' => json_encode($indexEntry->relations),
            ];
        })->chunk(500)->each(fn (LazyCollection $chunk) => IndexEntryVersion::query()->insert($chunk->values()->all()));

        /** @var array<string, string> $parentMap */
        $parentMap = [];

        $module->indexEntries()->cursor()->each(function (IndexEntry $entry) use (&$map, &$parentMap): void {
            if ($entry->parent_id !== null && isset($map[$entry->parent_id])) {
                $parentMap[$map[$entry->id]] = $map[$entry->parent_id];
            }
        });

        if ($parentMap !== []) {
            $table = (new IndexEntryVersion())->getTable();
            $this->bulkUpdateParents($table, $parentMap);
        }
    }

    private function publishGameData(Module $module, ModuleVersion $version): void
    {
        $module->gameData()->cursor()->map(fn (GameDatum $gameDatum): array => [
            'id' => Str::lower((string) Str::ulid()),
            'game_datum_id' => $gameDatum->id,
            'module_version_id' => $version->id,
            'type' => $gameDatum->type->value,
            'slug' => $gameDatum->slug,
            'name' => $gameDatum->name,
            'content' => json_encode($gameDatum->content),
        ])->chunk(500)->each(fn (LazyCollection $chunk) => GameDatumVersion::query()->insert($chunk->values()->all()));
    }

    /**
     * @param  array<string, string>  $parentMap  Map of version_id => parent_version_id
     */
    private function bulkUpdateParents(string $table, array $parentMap): void
    {
        $cases = '';
        $ids = [];

        foreach ($parentMap as $id => $parentId) {
            $cases .= sprintf("WHEN '%s' THEN '%s' ", $id, $parentId);
            $ids[] = $id;
        }

        $idList = implode("', '", $ids);

        DB::statement(sprintf("UPDATE `%s` SET `parent_id` = CASE `id` %sEND WHERE `id` IN ('%s')", $table, $cases, $idList));
    }

    private function generateStaticFiles(ModuleVersion $version): void
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
}
