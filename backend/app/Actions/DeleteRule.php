<?php

declare(strict_types=1);

namespace App\Actions;

use App\Enums\DraftChangeClassification;
use App\Enums\RuleDeletionMode;
use App\Models\Module;
use App\Models\Rule;
use App\Models\User;

/**
 * Deletes a rule and resolves its children according to the requested mode.
 *
 * In `re_parent` mode the rule's direct children are moved up to the deleted
 * rule's parent. In `recursive` mode the whole subtree is removed. Each live
 * mutation is recorded as a draft change through {@see RecordDraftChange}.
 */
final readonly class DeleteRule
{
    public function execute(
        Module $module,
        Rule $rule,
        RuleDeletionMode $mode,
        User $user,
        DraftChangeClassification $classification,
        RecordDraftChange $recordDraftChange,
    ): void {
        if ($mode === RuleDeletionMode::Recursive) {
            $this->deleteSubtree($module, $rule, $user, $classification, $recordDraftChange);

            return;
        }

        $this->reParentChildren($module, $rule, $user, $classification, $recordDraftChange);

        $this->delete($module, $rule, $user, $classification, $recordDraftChange);
    }

    private function reParentChildren(
        Module $module,
        Rule $rule,
        User $user,
        DraftChangeClassification $classification,
        RecordDraftChange $recordDraftChange,
    ): void {
        foreach ($rule->children()->get() as $child) {
            $before = $recordDraftChange->snapshotRule($child);

            $child->update(['parent_id' => $rule->parent_id]);

            $recordDraftChange->execute(
                $module,
                $user,
                'rule',
                $child->id,
                'update',
                $classification,
                $before,
                $recordDraftChange->snapshotRule($child),
            );
        }
    }

    private function deleteSubtree(
        Module $module,
        Rule $rule,
        User $user,
        DraftChangeClassification $classification,
        RecordDraftChange $recordDraftChange,
    ): void {
        foreach ($rule->children()->get() as $child) {
            $this->deleteSubtree($module, $child, $user, $classification, $recordDraftChange);
        }

        $this->delete($module, $rule, $user, $classification, $recordDraftChange);
    }

    private function delete(
        Module $module,
        Rule $rule,
        User $user,
        DraftChangeClassification $classification,
        RecordDraftChange $recordDraftChange,
    ): void {
        $before = $recordDraftChange->snapshotRule($rule);

        $rule->delete();

        $recordDraftChange->execute(
            $module,
            $user,
            'rule',
            $rule->id,
            'delete',
            $classification,
            $before,
            null,
        );
    }
}
