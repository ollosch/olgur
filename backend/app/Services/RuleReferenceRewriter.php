<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Pure helpers for detecting and rewriting rule-link tokens embedded in rule
 * content and index-entry relations.
 *
 * A `{{L:…}}` token may be a bare number (`1.2`), a number with a custom label
 * (`1.2#Label`), a module-qualified number (`core:3.4`), or any combination.
 * Bare numbers resolve in the module that owns the content unless rule numbers
 * are system-wide; qualified numbers resolve in the named module.
 */
final class RuleReferenceRewriter
{
    private const string TOKEN_PATTERN = '/\{\{L:([^}]+)\}\}/';

    /**
     * Extract every rule-link token in content as a parsed reference.
     *
     * @return list<array{slug: string|null, number: string, label: string|null}>
     */
    public static function extractReferences(string $content): array
    {
        preg_match_all(self::TOKEN_PATTERN, $content, $matches);

        return array_map(self::parseToken(...), $matches[1]);
    }

    /**
     * Whether the content references the old number in the target module's scope.
     */
    public static function referencesRule(
        string $content,
        string $targetSlug,
        string $owningSlug,
        string $oldNumber,
        bool $globalRuleNumbers,
    ): bool {
        preg_match_all(self::TOKEN_PATTERN, $content, $matches);

        foreach ($matches[1] as $key) {
            if (self::references(self::parseToken($key), $targetSlug, $owningSlug, $oldNumber, $globalRuleNumbers)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Rewrite every reference to the old number within the target module's scope.
     */
    public static function rewriteContent(
        string $content,
        string $targetSlug,
        string $owningSlug,
        string $oldNumber,
        string $newNumber,
        bool $globalRuleNumbers,
    ): string {
        return (string) preg_replace_callback(
            self::TOKEN_PATTERN,
            fn (array $matches): string => self::rewriteToken($matches[1], $targetSlug, $owningSlug, $oldNumber, $newNumber, $globalRuleNumbers),
            $content,
        );
    }

    /**
     * Rewrite bare rule-number references within an index entry's `rule_refs`.
     *
     * @param  array<int, string>  $ruleRefs
     * @return array<int, string>
     */
    public static function rewriteRuleRefs(array $ruleRefs, string $oldNumber, string $newNumber): array
    {
        return array_map(static fn (string $ref): string => $ref === $oldNumber ? $newNumber : $ref, $ruleRefs);
    }

    /**
     * @return array{slug: string|null, number: string, label: string|null}
     */
    private static function parseToken(string $key): array
    {
        $label = null;
        $hashPosition = mb_strpos($key, '#');

        if ($hashPosition !== false) {
            $label = mb_substr($key, $hashPosition + 1);
            $key = mb_substr($key, 0, $hashPosition);
        }

        $slug = null;
        $number = $key;
        $colonPosition = mb_strpos($key, ':');

        if ($colonPosition !== false) {
            $slug = mb_substr($key, 0, $colonPosition);
            $number = mb_substr($key, $colonPosition + 1);
        }

        return ['slug' => $slug, 'number' => $number, 'label' => $label];
    }

    /**
     * @param  array{slug: string|null, number: string, label: string|null}  $parsed
     */
    private static function references(
        array $parsed,
        string $targetSlug,
        string $owningSlug,
        string $oldNumber,
        bool $globalRuleNumbers,
    ): bool {
        if ($parsed['number'] !== $oldNumber) {
            return false;
        }

        if ($parsed['slug'] !== null) {
            return $parsed['slug'] === $targetSlug;
        }

        return $globalRuleNumbers || $owningSlug === $targetSlug;
    }

    private static function rewriteToken(
        string $key,
        string $targetSlug,
        string $owningSlug,
        string $oldNumber,
        string $newNumber,
        bool $globalRuleNumbers,
    ): string {
        $parsed = self::parseToken($key);

        if (! self::references($parsed, $targetSlug, $owningSlug, $oldNumber, $globalRuleNumbers)) {
            return '{{L:'.$key.'}}';
        }

        $newReference = $parsed['slug'] === null ? $newNumber : $parsed['slug'].':'.$newNumber;
        $label = $parsed['label'] === null ? '' : '#'.$parsed['label'];

        return '{{L:'.$newReference.$label.'}}';
    }
}
