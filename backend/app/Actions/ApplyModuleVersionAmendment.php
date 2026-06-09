<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\GameDatumVersion;
use App\Models\IndexEntryVersion;
use App\Models\ModuleVersion;
use App\Models\ModuleVersionAmendment;
use App\Models\RuleVersion;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

final readonly class ApplyModuleVersionAmendment
{
    public function __construct(private GenerateModuleVersionFiles $generateFiles) {}

    /**
     * @param  array<string, mixed>  $newContent
     */
    public function execute(
        ModuleVersion $version,
        User $user,
        string $entityType,
        string $entityId,
        string $changeType,
        string $description,
        array $newContent,
    ): ModuleVersionAmendment {
        $amendment = DB::transaction(function () use ($version, $user, $entityType, $entityId, $changeType, $description, $newContent): ModuleVersionAmendment {
            /** @var 'rule'|'index_entry'|'game_datum' $entityType */
            $contentAfter = match ($entityType) {
                'rule' => $this->applyRuleAmendment($version, $entityId, $newContent),
                'index_entry' => $this->applyIndexEntryAmendment($version, $entityId, $newContent),
                'game_datum' => $this->applyGameDatumAmendment($version, $entityId, $newContent),
            };

            $amendment = ModuleVersionAmendment::query()->create([
                'module_version_id' => $version->id,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'change_type' => $changeType,
                'description' => $description,
                'content_after' => $contentAfter,
                'amended_by' => $user->id,
                'amended_at' => now(),
            ]);

            $version->increment('revision');

            return $amendment;
        });

        /** @var 'rule'|'index_entry'|'game_datum' $entityType */
        match ($entityType) {
            'rule' => $this->generateFiles->generateRules($version),
            'index_entry' => $this->generateFiles->generateIndex($version),
            'game_datum' => $this->generateFiles->generateGameData($version),
        };

        return $amendment;
    }

    /**
     * @param  array<string, mixed>  $newContent
     * @return array<string, mixed>
     */
    private function applyRuleAmendment(ModuleVersion $version, string $entityId, array $newContent): array
    {
        $ruleVersion = RuleVersion::query()
            ->where('module_version_id', $version->id)
            ->where('id', $entityId)
            ->firstOrFail();

        /** @var array<string, mixed> $fields */
        $fields = Arr::only($newContent, ['content']);
        $ruleVersion->update($fields);

        return ['content' => $ruleVersion->content];
    }

    /**
     * @param  array<string, mixed>  $newContent
     * @return array<string, mixed>
     */
    private function applyIndexEntryAmendment(ModuleVersion $version, string $entityId, array $newContent): array
    {
        $indexEntryVersion = IndexEntryVersion::query()
            ->where('module_version_id', $version->id)
            ->where('id', $entityId)
            ->firstOrFail();

        /** @var array<string, mixed> $fields */
        $fields = Arr::only($newContent, ['definition', 'notes', 'relations']);
        $indexEntryVersion->update($fields);

        return [
            'definition' => $indexEntryVersion->definition,
            'notes' => $indexEntryVersion->notes,
            'relations' => $indexEntryVersion->relations,
        ];
    }

    /**
     * @param  array<string, mixed>  $newContent
     * @return array<string, mixed>
     */
    private function applyGameDatumAmendment(ModuleVersion $version, string $entityId, array $newContent): array
    {
        $gameDatumVersion = GameDatumVersion::query()
            ->where('module_version_id', $version->id)
            ->where('id', $entityId)
            ->firstOrFail();

        /** @var array<string, mixed> $fields */
        $fields = Arr::only($newContent, ['content']);
        $gameDatumVersion->update($fields);

        return ['content' => $gameDatumVersion->content];
    }
}
