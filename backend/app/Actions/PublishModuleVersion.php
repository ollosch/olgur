<?php

declare(strict_types=1);

namespace App\Actions;

use App\Enums\DraftChangeClassification;
use App\Models\Module;
use App\Models\ModuleDraftChange;
use App\Models\ModuleVersion;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final readonly class PublishModuleVersion
{
    public function __construct(private SnapshotModuleVersion $snapshot) {}

    /**
     * @param  array<int, array{entity_type: string, entity_id: string, note: string}>  $releaseNotes
     */
    public function execute(
        Module $module,
        User $releasedBy,
        string $version,
        string $notes,
        int $expectedDraftRevision,
        array $releaseNotes,
    ): ModuleVersion {
        return DB::transaction(function () use ($module, $releasedBy, $version, $notes, $expectedDraftRevision, $releaseNotes): ModuleVersion {
            $module = Module::query()->whereKey($module->id)->lockForUpdate()->firstOrFail();

            abort_if(
                $module->draft_revision !== $expectedDraftRevision,
                409,
                'The draft has changed since it was reviewed. Reload and try again.',
            );

            $this->validateReleaseNotesCoverage($module, $releaseNotes);

            $moduleVersion = ModuleVersion::query()->create([
                'module_id' => $module->id,
                'version_string' => $version,
                'notes' => $notes,
                'released_at' => now(),
                'released_by' => $releasedBy->id,
            ]);

            $this->snapshot->snapshot($module, $moduleVersion);

            ModuleDraftChange::query()
                ->where('module_id', $module->id)
                ->whereNull('module_version_id')
                ->update(['module_version_id' => $moduleVersion->id]);

            foreach ($releaseNotes as $releaseNote) {
                $moduleVersion->releaseNotes()->create([
                    'entity_type' => $releaseNote['entity_type'],
                    'entity_id' => $releaseNote['entity_id'],
                    'note' => $releaseNote['note'],
                ]);
            }

            return $moduleVersion;
        });
    }

    /**
     * @param  array<int, array{entity_type: string, entity_id: string, note: string}>  $releaseNotes
     */
    private function validateReleaseNotesCoverage(Module $module, array $releaseNotes): void
    {
        $semanticGroups = $module->draftChanges()
            ->whereNull('module_version_id')
            ->where('classification', DraftChangeClassification::Semantic->value)
            ->get()
            ->map(fn (ModuleDraftChange $change): string => $change->entity_type.':'.$change->entity_id)
            ->unique()
            ->values()
            ->all();

        $submittedGroups = array_map(
            fn (array $note): string => $note['entity_type'].':'.$note['entity_id'],
            $releaseNotes,
        );

        $matchesExactly = count($semanticGroups) === count($submittedGroups)
            && array_diff($semanticGroups, $submittedGroups) === []
            && array_diff($submittedGroups, $semanticGroups) === [];

        abort_unless($matchesExactly, 422, 'Release notes must cover exactly the semantic draft changes.');
    }
}
