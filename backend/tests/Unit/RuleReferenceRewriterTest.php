<?php

declare(strict_types=1);

use App\Services\RuleReferenceRewriter;

// ── referencesRule ───────────────────────────────────────────────────────────

it('detects a bare reference within the owning module', function (): void {
    expect(RuleReferenceRewriter::referencesRule('See {{L:1.2}}.', 'core', 'core', '1.2', false))->toBeTrue();
});

it('detects a qualified reference matching the target module', function (): void {
    expect(RuleReferenceRewriter::referencesRule('See {{L:core:1.2}}.', 'core', 'expansion', '1.2', false))->toBeTrue();
});

it('does not detect a bare reference in another module without global numbers', function (): void {
    expect(RuleReferenceRewriter::referencesRule('See {{L:1.2}}.', 'core', 'expansion', '1.2', false))->toBeFalse();
});

it('detects a bare reference in another module with global numbers', function (): void {
    expect(RuleReferenceRewriter::referencesRule('See {{L:1.2}}.', 'core', 'expansion', '1.2', true))->toBeTrue();
});

it('does not detect a qualified reference to another module', function (): void {
    expect(RuleReferenceRewriter::referencesRule('See {{L:expansion:1.2}}.', 'core', 'expansion', '1.2', false))->toBeFalse();
});

it('does not detect a different number', function (): void {
    expect(RuleReferenceRewriter::referencesRule('See {{L:3.3}}.', 'core', 'core', '1.2', false))->toBeFalse();
});

it('does not detect when there are no tokens', function (): void {
    expect(RuleReferenceRewriter::referencesRule('Plain content.', 'core', 'core', '1.2', false))->toBeFalse();
});

// ── rewriteContent ───────────────────────────────────────────────────────────

it('rewrites a bare reference', function (): void {
    $result = RuleReferenceRewriter::rewriteContent('See {{L:1.2}}.', 'core', 'core', '1.2', '9.9', false);

    expect($result)->toBe('See {{L:9.9}}.');
});

it('rewrites a bare reference preserving its label', function (): void {
    $result = RuleReferenceRewriter::rewriteContent('{{L:1.2#Label}}', 'core', 'core', '1.2', '9.9', false);

    expect($result)->toBe('{{L:9.9#Label}}');
});

it('rewrites a qualified reference in another module', function (): void {
    $result = RuleReferenceRewriter::rewriteContent('{{L:core:1.2}}', 'core', 'expansion', '1.2', '9.9', false);

    expect($result)->toBe('{{L:core:9.9}}');
});

it('rewrites a qualified reference preserving its label', function (): void {
    $result = RuleReferenceRewriter::rewriteContent('{{L:core:1.2#Label}}', 'core', 'expansion', '1.2', '9.9', false);

    expect($result)->toBe('{{L:core:9.9#Label}}');
});

it('leaves a different number untouched', function (): void {
    $result = RuleReferenceRewriter::rewriteContent('{{L:3.3}}', 'core', 'core', '1.2', '9.9', false);

    expect($result)->toBe('{{L:3.3}}');
});

it('leaves a qualified reference to another module untouched', function (): void {
    $result = RuleReferenceRewriter::rewriteContent('{{L:expansion:1.2}}', 'core', 'expansion', '1.2', '9.9', false);

    expect($result)->toBe('{{L:expansion:1.2}}');
});

it('leaves a bare reference in another module untouched without global numbers', function (): void {
    $result = RuleReferenceRewriter::rewriteContent('{{L:1.2}}', 'core', 'expansion', '1.2', '9.9', false);

    expect($result)->toBe('{{L:1.2}}');
});

it('rewrites a bare reference in another module with global numbers', function (): void {
    $result = RuleReferenceRewriter::rewriteContent('{{L:1.2}}', 'core', 'expansion', '1.2', '9.9', true);

    expect($result)->toBe('{{L:9.9}}');
});

it('leaves a range reference untouched', function (): void {
    $result = RuleReferenceRewriter::rewriteContent('{{L:1.2-1.4}}', 'core', 'core', '1.2', '9.9', false);

    expect($result)->toBe('{{L:1.2-1.4}}');
});

it('rewrites every matching token while leaving others untouched', function (): void {
    $result = RuleReferenceRewriter::rewriteContent('{{L:1.2}} and {{L:core:1.2}} and {{L:3.3}}', 'core', 'core', '1.2', '9.9', false);

    expect($result)->toBe('{{L:9.9}} and {{L:core:9.9}} and {{L:3.3}}');
});

it('returns content without tokens unchanged', function (): void {
    $result = RuleReferenceRewriter::rewriteContent('Plain content.', 'core', 'core', '1.2', '9.9', false);

    expect($result)->toBe('Plain content.');
});

// ── rewriteRuleRefs ──────────────────────────────────────────────────────────

it('rewrites matching rule refs', function (): void {
    expect(RuleReferenceRewriter::rewriteRuleRefs(['1.2', '3.3'], '1.2', '9.9'))->toBe(['9.9', '3.3']);
});

it('leaves non-matching rule refs untouched', function (): void {
    expect(RuleReferenceRewriter::rewriteRuleRefs(['3.3'], '1.2', '9.9'))->toBe(['3.3']);
});

it('returns an empty rule refs list unchanged', function (): void {
    expect(RuleReferenceRewriter::rewriteRuleRefs([], '1.2', '9.9'))->toBe([]);
});
