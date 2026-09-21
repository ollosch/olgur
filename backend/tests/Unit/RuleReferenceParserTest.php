<?php

declare(strict_types=1);

use App\Services\RuleReferenceParser;

// ── extractReferences ────────────────────────────────────────────────────────

it('extracts parsed references from content', function (): void {
    expect(RuleReferenceParser::extractReferences('See {{L:1.2}} and {{L:core:3.4#Label}}.'))->toBe([
        ['slug' => null, 'number' => '1.2', 'label' => null],
        ['slug' => 'core', 'number' => '3.4', 'label' => 'Label'],
    ]);
});

it('extracts an empty list from content without tokens', function (): void {
    expect(RuleReferenceParser::extractReferences('Plain content.'))->toBe([]);
});
