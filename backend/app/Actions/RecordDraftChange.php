<?php

declare(strict_types=1);

namespace App\Actions;

use App\Enums\DraftChangeClassification;
use App\Models\GameDatum;
use App\Models\IndexEntry;
use App\Models\Module;
use App\Models\Rule;
use App\Models\User;

/**
 * Records an append-only, editor-only draft change and advances the module's
 * draft revision. Callers must invoke this within the same transaction as the
 * live mutation it describes so the change log and revision stay consistent.
 */
final readonly class RecordDraftChange
{
    /**
     * @param  'create'|'update'|'delete'  $changeType
     * @param  array<string, mixed>|null  $contentBefore
     * @param  array<string, mixed>|null  $contentAfter
     */
    public function execute(
        Module $module,
        User $changedBy,
        string $entityType,
        string $entityId,
        string $changeType,
        DraftChangeClassification $classification,
        ?array $contentBefore,
        ?array $contentAfter,
    ): void {
        $module->draftChanges()->create([
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'change_type' => $changeType,
            'classification' => $classification,
            'content_before' => $contentBefore,
            'content_after' => $contentAfter,
            'changed_by' => $changedBy->id,
            'changed_at' => now(),
        ]);

        $module->increment('draft_revision');
    }

    /**
     * @return array<string, mixed>
     */
    public function snapshotRule(Rule $rule): array
    {
        return [
            'number' => $rule->number,
            'title' => $rule->title,
            'content' => $rule->content,
            'parent_id' => $rule->parent_id,
            'sort_order' => $rule->sort_order,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function snapshotIndexEntry(IndexEntry $indexEntry): array
    {
        return [
            'term' => $indexEntry->term,
            'definition' => $indexEntry->definition,
            'notes' => $indexEntry->notes,
            'relations' => $indexEntry->relations,
            'parent_id' => $indexEntry->parent_id,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function snapshotGameDatum(GameDatum $gameDatum): array
    {
        return [
            'type' => $gameDatum->type->value,
            'slug' => $gameDatum->slug,
            'name' => $gameDatum->name,
            'content' => $gameDatum->content,
        ];
    }
}
