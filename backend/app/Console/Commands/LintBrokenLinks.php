<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\IndexEntry;
use App\Models\Module;
use App\Models\Rule;
use App\Models\System;
use App\Services\BrokenLinkLinter;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Description('Scan a system for dangling rule references and report them')]
#[Signature('lint:broken-links {system : System slug or ULID to lint}')]
final class LintBrokenLinks extends Command
{
    public function handle(): int
    {
        $identifier = (string) $this->argument('system');

        $system = System::query()
            ->where('slug', $identifier)
            ->orWhere('id', $identifier)
            ->first();

        if ($system === null) {
            $this->error('System not found: '.$identifier);

            return self::FAILURE;
        }

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

        $broken = BrokenLinkLinter::lint($globalRuleNumbers, $modules);

        if ($broken === []) {
            $this->info(sprintf('No broken links found in system "%s".', $system->slug));

            return self::SUCCESS;
        }

        foreach ($broken as $reference) {
            $this->warn(sprintf(
                '[%s] %s "%s" references "%s" (%s)',
                $reference->module,
                $reference->kind->value,
                $reference->location,
                $reference->reference,
                $reference->reason->value,
            ));
        }

        $this->error(sprintf('%d broken link(s) found in system "%s".', count($broken), $system->slug));

        return self::FAILURE;
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
