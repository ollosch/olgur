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
     * Rule-number chapters whose references are temporarily ignored by the lint.
     *
     * These ASL chapters are gradually being (re)admitted; until their content
     * is complete, references into them are suppressed so the report focuses on
     * the chapters that are currently expected to be clean.
     *
     * @var list<string>
     */
    private const array IGNORED_CHAPTERS = ['F', 'O', 'P', 'Q', 'R', 'S', 'T'];

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
                    if (self::isIgnoredChapter($reference['number'])) {
                        continue;
                    }

                    $reason = self::resolve($reference['slug'], $reference['number'], $module['slug'], $globalRuleNumbers, $numbersBySlug, $allNumbers, $slugs);

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
                    if (self::isIgnoredChapter($ref)) {
                        continue;
                    }

                    $reason = self::resolve(null, $ref, $module['slug'], $globalRuleNumbers, $numbersBySlug, $allNumbers, $slugs);

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
     * Whether a rule reference's number belongs to a temporarily ignored chapter.
     *
     * A range reference is ignored when its leading chapter letter matches; its
     * endpoints always share the same chapter in practice.
     */
    private static function isIgnoredChapter(string $number): bool
    {
        $chapter = mb_strtoupper(mb_substr($number, 0, 1));

        return in_array($chapter, self::IGNORED_CHAPTERS, true);
    }

    /**
     * @param  array<string, array<string, true>>  $numbersBySlug
     * @param  array<string, true>  $allNumbers
     * @param  list<string>  $slugs
     */
    private static function resolve(
        ?string $slug,
        string $number,
        string $owningSlug,
        bool $globalRuleNumbers,
        array $numbersBySlug,
        array $allNumbers,
        array $slugs,
    ): ?BrokenReferenceReason {
        if (! str_contains($number, '-')) {
            return self::resolveNumber($slug, $number, $owningSlug, $globalRuleNumbers, $numbersBySlug, $allNumbers, $slugs);
        }

        [$from, $to] = explode('-', $number, 2);

        return self::resolveNumber($slug, $from, $owningSlug, $globalRuleNumbers, $numbersBySlug, $allNumbers, $slugs)
            ?? self::resolveNumber($slug, $to, $owningSlug, $globalRuleNumbers, $numbersBySlug, $allNumbers, $slugs);
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
