<?php

declare(strict_types=1);

namespace App\Actions;

use App\Data\BrokenReference;
use App\Models\IndexEntry;
use App\Models\Module;
use App\Models\Rule;
use App\Models\System;
use App\Services\BrokenLinkLinter;

/**
 * Loads a system's live content and runs the broken-link lint over it.
 *
 * The lint itself is a pure function ({@see BrokenLinkLinter}); this action is
 * responsible only for loading the system's modules, rules, and index entries
 * and describing them in the shape the linter expects.
 */
final readonly class ScanBrokenLinks
{
    /**
     * @return list<BrokenReference>
     */
    public function execute(System $system): array
    {
        $globalRuleNumbers = $system->config?->hasGlobalRuleNumbers() ?? false;

        /** @var list<array{slug: string, numbers: list<string>, rules: list<array{number: string, content: string}>, entries: list<array{term: string, refs: list<string>}>}> $modules */
        $modules = $system->modules()
            ->with(['rules', 'indexEntries'])
            ->get()
            ->map(fn (Module $module): array => [
                'slug' => $module->slug,
                'numbers' => $module->rules->map(fn (Rule $rule): string => $rule->number)->all(),
                'rules' => $module->rules->map(fn (Rule $rule): array => [
                    'number' => $rule->number,
                    'content' => $rule->content,
                ])->all(),
                'entries' => $module->indexEntries->map(fn (IndexEntry $entry): array => [
                    'term' => $entry->term,
                    'refs' => $this->ruleRefs($entry),
                ])->all(),
            ])
            ->values()
            ->all();

        return BrokenLinkLinter::lint($globalRuleNumbers, $modules);
    }

    /**
     * @return list<string>
     */
    private function ruleRefs(IndexEntry $entry): array
    {
        $ruleRefs = $entry->relations['rule_refs'] ?? null;

        if (! is_array($ruleRefs)) {
            return [];
        }

        /** @var list<string> $refs */
        $refs = array_values(array_filter($ruleRefs, is_string(...)));

        return $refs;
    }
}
