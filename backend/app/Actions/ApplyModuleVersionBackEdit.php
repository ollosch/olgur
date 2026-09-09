<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\GameDatumVersion;
use App\Models\IndexEntryVersion;
use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\RuleVersion;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

/**
 * Applies a constrained, latest-only back-edit to a single snapshot record.
 *
 * Back-edits may change reader-facing text or content data, but never tree
 * structure, identifiers, or references. They create no amendment history; each
 * success increments the snapshot's opaque `revision` so released-content caches
 * are bypassed without changing the `version_string`.
 */
final class ApplyModuleVersionBackEdit
{
    /**
     * @param  array<string, mixed>  $content
     */
    public function execute(
        Module $module,
        ModuleVersion $version,
        string $entityType,
        string $entityId,
        int $expectedRevision,
        array $content,
    ): ModuleVersion {
        return DB::transaction(function () use ($module, $version, $entityType, $entityId, $expectedRevision, $content): ModuleVersion {
            $version = ModuleVersion::query()
                ->whereKey($version->id)
                ->lockForUpdate()
                ->firstOrFail();

            $latest = ModuleVersion::query()
                ->where('module_id', $module->id)
                ->whereNotNull('released_at')
                ->latest('released_at')
                ->lockForUpdate()
                ->first();

            abort_if($latest === null || $latest->id !== $version->id, 409, 'Only the latest released version can receive back-edits.');
            abort_if($version->revision !== $expectedRevision, 409, 'The version has changed since it was loaded. Reload and try again.');

            /** @var 'rule'|'index_entry'|'game_datum' $entityType */
            match ($entityType) {
                'rule' => $this->amendRule($version, $entityId, $content),
                'index_entry' => $this->amendIndexEntry($version, $entityId, $content),
                'game_datum' => $this->amendGameDatum($version, $entityId, $content),
            };

            $version->increment('revision');

            return $version->refresh();
        });
    }

    /**
     * @param  array<string, mixed>  $content
     */
    private function amendRule(ModuleVersion $version, string $entityId, array $content): void
    {
        $ruleVersion = RuleVersion::query()
            ->where('module_version_id', $version->id)
            ->where('id', $entityId)
            ->firstOrFail();

        /** @var array<string, mixed> $fields */
        $fields = Arr::only($content, ['content']);
        $ruleVersion->update($fields);
    }

    /**
     * @param  array<string, mixed>  $content
     */
    private function amendIndexEntry(ModuleVersion $version, string $entityId, array $content): void
    {
        $indexEntryVersion = IndexEntryVersion::query()
            ->where('module_version_id', $version->id)
            ->where('id', $entityId)
            ->firstOrFail();

        /** @var array<string, mixed> $fields */
        $fields = Arr::only($content, ['definition', 'notes']);
        $indexEntryVersion->update($fields);
    }

    /**
     * @param  array<string, mixed>  $content
     */
    private function amendGameDatum(ModuleVersion $version, string $entityId, array $content): void
    {
        $gameDatumVersion = GameDatumVersion::query()
            ->where('module_version_id', $version->id)
            ->where('id', $entityId)
            ->firstOrFail();

        /** @var array<string, mixed> $fields */
        $fields = Arr::only($content, ['content']);
        $gameDatumVersion->update($fields);
    }
}
