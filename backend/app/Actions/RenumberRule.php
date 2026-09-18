<?php

declare(strict_types=1);

namespace App\Actions;

use App\Enums\DraftChangeClassification;
use App\Models\IndexEntry;
use App\Models\Module;
use App\Models\Rule;
use App\Models\System;
use App\Models\User;
use App\Services\RuleReferenceRewriter;
use Illuminate\Support\Collection;

/**
 * Renumbers a rule and rewrites the references that pointed at its old number.
 *
 * The operation is previewable: callers can list affected rules and index
 * entries before confirming. Confirming rewrites the rule's own number, the
 * matching `{{L:…}}` tokens in affected rule content, and the matching
 * `rule_refs` entries, recording each mutation as a semantic draft change.
 */
final readonly class RenumberRule
{
    /**
     * @return array<string, mixed>
     */
    public function preview(System $system, Module $module, Rule $rule, string $newNumber): array
    {
        return [
            'rule' => [
                'id' => $rule->id,
                'number' => $rule->number,
                'new_number' => $newNumber,
            ],
            'affected_rules' => $this->affectedRules($system, $module, $rule)
                ->map(fn (array $affected): array => [
                    'id' => $affected['rule']->id,
                    'number' => $affected['rule']->number,
                    'title' => $affected['rule']->title,
                ])
                ->values()
                ->all(),
            'affected_index_entries' => $this->affectedIndexEntries($module, $rule)
                ->map(fn (IndexEntry $entry): array => [
                    'id' => $entry->id,
                    'term' => $entry->term,
                ])
                ->values()
                ->all(),
        ];
    }

    public function apply(
        System $system,
        Module $module,
        Rule $rule,
        string $newNumber,
        User $user,
        RecordDraftChange $recordDraftChange,
    ): void {
        $globalRuleNumbers = $system->config?->hasGlobalRuleNumbers() ?? false;
        $targetSlug = $module->slug;
        $oldNumber = $rule->number;

        $affectedRules = $this->affectedRules($system, $module, $rule);
        $affectedIndexEntries = $this->affectedIndexEntries($module, $rule);

        $before = $recordDraftChange->snapshotRule($rule);

        $rule->update([
            'number' => $newNumber,
            'content' => RuleReferenceRewriter::rewriteContent($rule->content, $targetSlug, $targetSlug, $oldNumber, $newNumber, $globalRuleNumbers),
        ]);

        $recordDraftChange->execute($module, $user, 'rule', $rule->id, 'update', DraftChangeClassification::Semantic, $before, $recordDraftChange->snapshotRule($rule));

        foreach ($affectedRules as $affected) {
            $affectedRule = $affected['rule'];
            $owningModule = $affected['module'];
            $before = $recordDraftChange->snapshotRule($affectedRule);

            $affectedRule->update([
                'content' => RuleReferenceRewriter::rewriteContent($affectedRule->content, $targetSlug, $owningModule->slug, $oldNumber, $newNumber, $globalRuleNumbers),
            ]);

            $recordDraftChange->execute($owningModule, $user, 'rule', $affectedRule->id, 'update', DraftChangeClassification::Semantic, $before, $recordDraftChange->snapshotRule($affectedRule));
        }

        foreach ($affectedIndexEntries as $entry) {
            $before = $recordDraftChange->snapshotIndexEntry($entry);

            /** @var array<string, mixed> $relations */
            $relations = $entry->relations;

            /** @var array<int, string> $ruleRefs */
            $ruleRefs = $relations['rule_refs'] ?? [];

            $relations['rule_refs'] = RuleReferenceRewriter::rewriteRuleRefs($ruleRefs, $oldNumber, $newNumber);

            $entry->update(['relations' => $relations]);

            $recordDraftChange->execute($module, $user, 'index_entry', $entry->id, 'update', DraftChangeClassification::Semantic, $before, $recordDraftChange->snapshotIndexEntry($entry));
        }
    }

    /**
     * @return Collection<int, array{rule: Rule, module: Module}>
     */
    private function affectedRules(System $system, Module $module, Rule $rule): Collection
    {
        $globalRuleNumbers = $system->config?->hasGlobalRuleNumbers() ?? false;
        $targetSlug = $module->slug;
        $oldNumber = $rule->number;

        $affected = new Collection();

        foreach ($system->modules()->with('rules')->get() as $moduleInSystem) {
            foreach ($moduleInSystem->rules as $candidate) {
                if ($candidate->is($rule)) {
                    continue;
                }

                if (RuleReferenceRewriter::referencesRule($candidate->content, $targetSlug, $moduleInSystem->slug, $oldNumber, $globalRuleNumbers)) {
                    $affected->push(['rule' => $candidate, 'module' => $moduleInSystem]);
                }
            }
        }

        return $affected;
    }

    /**
     * @return Collection<int, IndexEntry>
     */
    private function affectedIndexEntries(Module $module, Rule $rule): Collection
    {
        $oldNumber = $rule->number;

        return $module->indexEntries()->get()
            ->filter(function (IndexEntry $entry) use ($oldNumber): bool {
                $ruleRefs = $entry->relations['rule_refs'] ?? null;

                return is_array($ruleRefs) && in_array($oldNumber, $ruleRefs, true);
            })
            ->values();
    }
}
