<?php

declare(strict_types=1);

use App\Data\BrokenReference;
use App\Enums\BrokenReferenceKind;
use App\Enums\BrokenReferenceReason;
use App\Services\BrokenLinkLinter;

/**
 * @param  list<array{number: string, content: string}>  $rules
 * @param  list<array{term: string, refs: list<string>}>  $entries
 * @return list<array{slug: string, numbers: list<string>, rules: list<array{number: string, content: string}>, entries: list<array{term: string, refs: list<string>}>}>
 */
function module(
    string $slug,
    array $numbers,
    array $rules = [],
    array $entries = [],
): array {
    return [
        'slug' => $slug,
        'numbers' => $numbers,
        'rules' => $rules,
        'entries' => $entries,
    ];
}

it('reports nothing when content has no tokens', function (): void {
    $modules = [
        module('core', ['1.1'], [['number' => '1.1', 'content' => 'Plain content.']]),
    ];

    expect(BrokenLinkLinter::lint(false, $modules))->toBe([]);
});

it('resolves a bare token in the owning module', function (): void {
    $modules = [
        module('core', ['1.1', '1.2'], [['number' => '1.1', 'content' => 'See {{L:1.2}}.']]),
    ];

    expect(BrokenLinkLinter::lint(false, $modules))->toBe([]);
});

it('flags a bare token whose number is missing from the owning module', function (): void {
    $modules = [
        module('core', ['1.1'], [['number' => '1.1', 'content' => 'See {{L:9.9}}.']]),
    ];

    $broken = BrokenLinkLinter::lint(false, $modules);

    expect($broken)->toHaveCount(1);

    $reference = $broken[0];

    expect($reference)->toBeInstanceOf(BrokenReference::class)
        ->and($reference->module)->toBe('core')
        ->and($reference->location)->toBe('1.1')
        ->and($reference->kind)->toBe(BrokenReferenceKind::Rule)
        ->and($reference->reference)->toBe('{{L:9.9}}')
        ->and($reference->reason)->toBe(BrokenReferenceReason::UnknownNumber);
});

it('resolves a bare token across modules when rule numbers are global', function (): void {
    $modules = [
        module('core', ['1.1'], [['number' => '1.1', 'content' => 'Core.']]),
        module('expansion', ['2.1'], [['number' => '2.1', 'content' => 'See {{L:1.1}}.']]),
    ];

    expect(BrokenLinkLinter::lint(true, $modules))->toBe([]);
});

it('flags a bare token missing everywhere when rule numbers are global', function (): void {
    $modules = [
        module('core', ['1.1'], [['number' => '1.1', 'content' => 'See {{L:9.9}}.']]),
    ];

    $broken = BrokenLinkLinter::lint(true, $modules);

    expect($broken)->toHaveCount(1)
        ->and($broken[0]->reason)->toBe(BrokenReferenceReason::UnknownNumber);
});

it('does not resolve a bare token in another module without global numbers', function (): void {
    $modules = [
        module('core', ['1.1'], [['number' => '1.1', 'content' => 'Core.']]),
        module('expansion', ['2.1'], [['number' => '2.1', 'content' => 'See {{L:1.1}}.']]),
    ];

    $broken = BrokenLinkLinter::lint(false, $modules);

    expect($broken)->toHaveCount(1)
        ->and($broken[0]->module)->toBe('expansion')
        ->and($broken[0]->reference)->toBe('{{L:1.1}}')
        ->and($broken[0]->reason)->toBe(BrokenReferenceReason::UnknownNumber);
});

it('resolves a qualified token with a known slug and number', function (): void {
    $modules = [
        module('core', ['1.1'], [['number' => '1.1', 'content' => 'Core.']]),
        module('expansion', ['2.1'], [['number' => '2.1', 'content' => 'See {{L:core:1.1}}.']]),
    ];

    expect(BrokenLinkLinter::lint(false, $modules))->toBe([]);
});

it('flags a qualified token whose slug is unknown', function (): void {
    $modules = [
        module('core', ['1.1'], [['number' => '1.1', 'content' => 'See {{L:missing:1.1}}.']]),
    ];

    $broken = BrokenLinkLinter::lint(false, $modules);

    expect($broken)->toHaveCount(1)
        ->and($broken[0]->reference)->toBe('{{L:missing:1.1}}')
        ->and($broken[0]->reason)->toBe(BrokenReferenceReason::UnknownSlug);
});

it('flags a qualified token whose number is missing from the named module', function (): void {
    $modules = [
        module('core', ['1.1'], [['number' => '1.1', 'content' => 'See {{L:core:9.9}}.']]),
    ];

    $broken = BrokenLinkLinter::lint(false, $modules);

    expect($broken)->toHaveCount(1)
        ->and($broken[0]->reference)->toBe('{{L:core:9.9}}')
        ->and($broken[0]->reason)->toBe(BrokenReferenceReason::UnknownNumber);
});

it('resolves a range whose endpoints both exist', function (): void {
    $modules = [
        module('core', ['1.2', '1.3', '1.4'], [['number' => '1.2', 'content' => 'See {{L:1.2-1.4}}.']]),
    ];

    expect(BrokenLinkLinter::lint(false, $modules))->toBe([]);
});

it('flags a range when an endpoint is missing', function (): void {
    $modules = [
        module('core', ['1.2', '1.3'], [['number' => '1.2', 'content' => 'See {{L:1.2-1.4}}.']]),
    ];

    $broken = BrokenLinkLinter::lint(false, $modules);

    expect($broken)->toHaveCount(1)
        ->and($broken[0]->reference)->toBe('{{L:1.2-1.4}}')
        ->and($broken[0]->reason)->toBe(BrokenReferenceReason::UnknownNumber);
});

it('flags a qualified range with an unknown slug', function (): void {
    $modules = [
        module('core', ['1.2', '1.4'], [['number' => '1.2', 'content' => 'See {{L:missing:1.2-1.4}}.']]),
    ];

    $broken = BrokenLinkLinter::lint(false, $modules);

    expect($broken)->toHaveCount(1)
        ->and($broken[0]->reference)->toBe('{{L:missing:1.2-1.4}}')
        ->and($broken[0]->reason)->toBe(BrokenReferenceReason::UnknownSlug);
});

it('preserves a custom label when rendering a broken token', function (): void {
    $modules = [
        module('core', ['1.1'], [['number' => '1.1', 'content' => 'See {{L:9.9#The Rule}}.']]),
    ];

    $broken = BrokenLinkLinter::lint(false, $modules);

    expect($broken)->toHaveCount(1)
        ->and($broken[0]->reference)->toBe('{{L:9.9#The Rule}}');
});

it('resolves index entry rule refs in the owning module', function (): void {
    $modules = [
        module('core', ['1.1'], [], [['term' => 'Alpha', 'refs' => ['1.1']]]),
    ];

    expect(BrokenLinkLinter::lint(false, $modules))->toBe([]);
});

it('flags an index entry rule ref pointing at a missing number', function (): void {
    $modules = [
        module('core', ['1.1'], [], [['term' => 'Alpha', 'refs' => ['9.9']]]),
    ];

    $broken = BrokenLinkLinter::lint(false, $modules);

    expect($broken)->toHaveCount(1)
        ->and($broken[0]->module)->toBe('core')
        ->and($broken[0]->location)->toBe('Alpha')
        ->and($broken[0]->kind)->toBe(BrokenReferenceKind::Index)
        ->and($broken[0]->reference)->toBe('9.9')
        ->and($broken[0]->reason)->toBe(BrokenReferenceReason::UnknownNumber);
});

it('resolves index entry rule refs across modules when rule numbers are global', function (): void {
    $modules = [
        module('core', ['1.1'], []),
        module('expansion', ['2.1'], [], [['term' => 'Beta', 'refs' => ['1.1']]]),
    ];

    expect(BrokenLinkLinter::lint(true, $modules))->toBe([]);
});

it('flags an index entry rule ref in another module without global numbers', function (): void {
    $modules = [
        module('core', ['1.1'], []),
        module('expansion', ['2.1'], [], [['term' => 'Beta', 'refs' => ['1.1']]]),
    ];

    $broken = BrokenLinkLinter::lint(false, $modules);

    expect($broken)->toHaveCount(1)
        ->and($broken[0]->module)->toBe('expansion')
        ->and($broken[0]->reason)->toBe(BrokenReferenceReason::UnknownNumber);
});

it('reports every broken reference across rules and entries', function (): void {
    $modules = [
        module('core', ['1.1'], [
            ['number' => '1.1', 'content' => 'See {{L:9.9}} and {{L:missing:1.1}}.'],
        ], [
            ['term' => 'Alpha', 'refs' => ['8.8']],
        ]),
    ];

    $broken = BrokenLinkLinter::lint(false, $modules);

    expect($broken)->toHaveCount(3);
});

it('resolves an index entry range ref when both endpoints exist', function (): void {
    $modules = [
        module('core', ['C.3.3.2', 'C.3.3.3'], [], [['term' => 'TH vs Multi-Levels', 'refs' => ['C.3.3.2-C.3.3.3']]]),
    ];

    expect(BrokenLinkLinter::lint(false, $modules))->toBe([]);
});

it('flags an index entry range ref when an endpoint is missing', function (): void {
    $modules = [
        module('core', ['C.3.3.2'], [], [['term' => 'TH vs Multi-Levels', 'refs' => ['C.3.3.2-C.3.3.3']]]),
    ];

    $broken = BrokenLinkLinter::lint(false, $modules);

    expect($broken)->toHaveCount(1)
        ->and($broken[0]->kind)->toBe(BrokenReferenceKind::Index)
        ->and($broken[0]->reference)->toBe('C.3.3.2-C.3.3.3')
        ->and($broken[0]->reason)->toBe(BrokenReferenceReason::UnknownNumber);
});

it('ignores a broken rule reference into an ignored chapter', function (): void {
    $modules = [
        module('core', ['1.1'], [['number' => '1.1', 'content' => 'See {{L:O.1.2}}.']]),
    ];

    expect(BrokenLinkLinter::lint(false, $modules))->toBe([]);
});

it('ignores a broken index reference into an ignored chapter', function (): void {
    $modules = [
        module('core', ['1.1'], [], [['term' => 'Alpha', 'refs' => ['S.9.9']]]),
    ];

    expect(BrokenLinkLinter::lint(false, $modules))->toBe([]);
});

it('ignores a broken range reference into an ignored chapter', function (): void {
    $modules = [
        module('core', ['1.1'], [['number' => '1.1', 'content' => 'See {{L:T.1-T.2}}.']]),
    ];

    expect(BrokenLinkLinter::lint(false, $modules))->toBe([]);
});

it('still flags a broken reference into a non-ignored chapter', function (): void {
    $modules = [
        module('core', ['1.1'], [['number' => '1.1', 'content' => 'See {{L:C.9.9}}.']]),
    ];

    $broken = BrokenLinkLinter::lint(false, $modules);

    expect($broken)->toHaveCount(1)
        ->and($broken[0]->reference)->toBe('{{L:C.9.9}}');
});
