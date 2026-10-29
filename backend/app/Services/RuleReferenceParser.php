<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Pure helper for extracting rule-link tokens embedded in rule content.
 *
 * A `{{L:…}}` token may be a bare number (`1.2`), a number with a custom label
 * (`1.2#Label`), a module-qualified number (`core:3.4`), or any combination.
 * Bare numbers resolve in the module that owns the content unless rule numbers
 * are system-wide; qualified numbers resolve in the named module.
 */
final class RuleReferenceParser
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

        return array_map(self::parseReference(...), $matches[1]);
    }

    /**
     * @return array{slug: string|null, number: string, label: string|null}
     */
    public static function parseReference(string $key): array
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
}
