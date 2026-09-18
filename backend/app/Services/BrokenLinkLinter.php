<?php

declare(strict_types=1);

namespace App\Services;

use App\Data\BrokenReference;
use App\Enums\BrokenReferenceKind;
use App\Enums\BrokenReferenceReason;

/**
 * Reports dangling rule references across a system's loaded content.
 *
 * The lint is a pure, deterministic function over already-loaded content: it
 * performs no database access. Callers load rules and index entries, describe
 * each module as a plain array, and receive a list of {@see BrokenReference}
 * records for every reference that does not resolve.
 */
final class BrokenLinkLinter
{
    /**
     * @param  list<array{
     *     slug: string,
     *     numbers: list<string>,
     *     rules: list<array{number: string, content: string}>,
     *     entries: list<array{term: string, refs: list<string>}>
     * }>  $modules
     * @return list<BrokenReference>
     */
    public static function lint(bool $globalRuleNumbers, array $modules): array
    {
        /** @var array<string, array<string, true>> $numbersBySlug */
        $numbersBySlug = [];
        /** @var array<string, true> $allNumbers */
        $allNumbers = [];

        foreach ($modules as $module) {
            $numbers = array_fill_keys($module['numbers'], true);
            $numbersBySlug[$module['slug']] = $numbers;
            $allNumbers += $numbers;
        }

        $slugs = array_keys($numbersBySlug);

        $broken = [];

        foreach ($modules as $module) {
            foreach ($module['rules'] as $rule) {
                foreach (RuleReferenceRewriter::extractReferences($rule['content']) as $reference) {
                    $reason = self::resolve($reference, $module['slug'], $globalRuleNumbers, $numbersBySlug, $allNumbers, $slugs);

                    if (! $reason instanceof BrokenReferenceReason) {
                        continue;
                    }

                    $broken[] = new BrokenReference(
                        module: $module['slug'],
                        location: $rule['number'],
                        kind: BrokenReferenceKind::Rule,
                        reference: self::render($reference),
                        reason: $reason,
                    );
                }
            }

            foreach ($module['entries'] as $entry) {
                foreach ($entry['refs'] as $ref) {
                    $reason = self::resolveNumber(null, $ref, $module['slug'], $globalRuleNumbers, $numbersBySlug, $allNumbers, $slugs);

                    if (! $reason instanceof BrokenReferenceReason) {
                        continue;
                    }

                    $broken[] = new BrokenReference(
                        module: $module['slug'],
                        location: $entry['term'],
                        kind: BrokenReferenceKind::Index,
                        reference: $ref,
                        reason: $reason,
                    );
                }
            }
        }

        return $broken;
    }

    /**
     * @param  array{slug: string|null, number: string, label: string|null}  $reference
     * @param  array<string, array<string, true>>  $numbersBySlug
     * @param  array<string, true>  $allNumbers
     * @param  list<string>  $slugs
     */
    private static function resolve(
        array $reference,
        string $owningSlug,
        bool $globalRuleNumbers,
        array $numbersBySlug,
        array $allNumbers,
        array $slugs,
    ): ?BrokenReferenceReason {
        $number = $reference['number'];

        if (! str_contains($number, '-')) {
            return self::resolveNumber($reference['slug'], $number, $owningSlug, $globalRuleNumbers, $numbersBySlug, $allNumbers, $slugs);
        }

        [$from, $to] = explode('-', $number, 2);

        return self::resolveNumber($reference['slug'], $from, $owningSlug, $globalRuleNumbers, $numbersBySlug, $allNumbers, $slugs)
            ?? self::resolveNumber($reference['slug'], $to, $owningSlug, $globalRuleNumbers, $numbersBySlug, $allNumbers, $slugs);
    }

    /**
     * @param  array<string, array<string, true>>  $numbersBySlug
     * @param  array<string, true>  $allNumbers
     * @param  list<string>  $slugs
     */
    private static function resolveNumber(
        ?string $slug,
        string $number,
        string $owningSlug,
        bool $globalRuleNumbers,
        array $numbersBySlug,
        array $allNumbers,
        array $slugs,
    ): ?BrokenReferenceReason {
        if ($slug !== null) {
            if (! in_array($slug, $slugs, true)) {
                return BrokenReferenceReason::UnknownSlug;
            }

            return isset($numbersBySlug[$slug][$number]) ? null : BrokenReferenceReason::UnknownNumber;
        }

        if ($globalRuleNumbers) {
            return isset($allNumbers[$number]) ? null : BrokenReferenceReason::UnknownNumber;
        }

        return isset($numbersBySlug[$owningSlug][$number]) ? null : BrokenReferenceReason::UnknownNumber;
    }

    /**
     * @param  array{slug: string|null, number: string, label: string|null}  $reference
     */
    private static function render(array $reference): string
    {
        $key = $reference['slug'] === null ? '' : $reference['slug'].':';
        $key .= $reference['number'];
        $key .= $reference['label'] === null ? '' : '#'.$reference['label'];

        return '{{L:'.$key.'}}';
    }
}
