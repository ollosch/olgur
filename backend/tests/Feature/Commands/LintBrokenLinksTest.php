<?php

declare(strict_types=1);

use App\Models\IndexEntry;
use App\Models\Module;
use App\Models\Rule;
use App\Models\System;

use function Pest\Laravel\artisan;

test('lint reports no broken links for a clean system', function (): void {
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->create(['slug' => 'core', 'is_core' => true]);
    Rule::factory()->for($core)->create(['number' => '1.1', 'content' => 'See {{L:1.2}}.']);
    Rule::factory()->for($core)->create(['number' => '1.2', 'content' => 'See {{L:1.1}}.', 'sort_order' => 1]);
    IndexEntry::factory()->for($core)->create(['term' => 'Alpha', 'relations' => ['rule_refs' => ['1.1']]]);

    artisan('lint:broken-links', ['system' => $system->slug])
        ->assertSuccessful()
        ->expectsOutputToContain('No broken links found');
});

test('lint reports dangling rule tokens and rule refs', function (): void {
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->create(['slug' => 'core', 'is_core' => true]);
    Rule::factory()->for($core)->create(['number' => '1.1', 'content' => 'See {{L:9.9}}.']);
    IndexEntry::factory()->for($core)->create(['term' => 'Alpha', 'relations' => ['rule_refs' => ['8.8']]]);

    artisan('lint:broken-links', ['system' => $system->slug])
        ->assertFailed()
        ->expectsOutputToContain('2 broken link(s) found');
});

test('lint resolves a bare token system-wide when rule numbers are global', function (): void {
    $system = System::factory()->withGlobalRuleNumbers()->create();
    $core = Module::factory()->for($system)->create(['slug' => 'core', 'is_core' => true]);
    $expansion = Module::factory()->for($system)->create(['slug' => 'expansion']);
    Rule::factory()->for($core)->create(['number' => '1.1', 'content' => 'Core.']);
    Rule::factory()->for($expansion)->create(['number' => '2.1', 'content' => 'See {{L:1.1}}.']);

    artisan('lint:broken-links', ['system' => $system->slug])
        ->assertSuccessful()
        ->expectsOutputToContain('No broken links found');
});

test('lint resolves a qualified token to another module', function (): void {
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->create(['slug' => 'core', 'is_core' => true]);
    $expansion = Module::factory()->for($system)->create(['slug' => 'expansion']);
    Rule::factory()->for($core)->create(['number' => '1.1', 'content' => 'Core.']);
    Rule::factory()->for($expansion)->create(['number' => '2.1', 'content' => 'See {{L:core:1.1}}.']);

    artisan('lint:broken-links', ['system' => $system->slug])
        ->assertSuccessful()
        ->expectsOutputToContain('No broken links found');
});

test('lint ignores index entries without rule refs', function (): void {
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->create(['slug' => 'core', 'is_core' => true]);
    Rule::factory()->for($core)->create(['number' => '1.1', 'content' => 'Core.']);
    IndexEntry::factory()->for($core)->create(['term' => 'Alpha', 'relations' => ['see_also' => ['Beta']]]);

    artisan('lint:broken-links', ['system' => $system->slug])
        ->assertSuccessful()
        ->expectsOutputToContain('No broken links found');
});

test('lint exits with failure when the system does not exist', function (): void {
    artisan('lint:broken-links', ['system' => 'does-not-exist'])
        ->assertFailed()
        ->expectsOutputToContain('System not found');
});

test('lint accepts a system ULID', function (): void {
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->create(['slug' => 'core']);
    Rule::factory()->for($core)->create(['number' => '1.1', 'content' => 'See {{L:1.2}}.']);
    Rule::factory()->for($core)->create(['number' => '1.2', 'content' => 'See {{L:1.1}}.', 'sort_order' => 1]);

    artisan('lint:broken-links', ['system' => $system->id])
        ->assertSuccessful()
        ->expectsOutputToContain('No broken links found');
});
