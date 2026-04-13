<?php

declare(strict_types=1);

use App\Models\Module;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;
use Illuminate\Database\QueryException;

test('a module can be created with factory defaults', function (): void {
    $module = Module::factory()->create();

    expect($module->id)->toBeString()
        ->and($module->slug)->toBeString()
        ->and($module->name)->toBeString()
        ->and($module->is_core)->toBeFalse()
        ->and($module->config)->toBeNull();
});

test('module uses ulid primary key', function (): void {
    $module = Module::factory()->create();

    expect($module->id)->toBeString()->toHaveLength(26);
});

test('module slug is unique per system', function (): void {
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['slug' => 'core']);

    expect(fn () => Module::factory()->for($system)->create(['slug' => 'core']))
        ->toThrow(QueryException::class);
});

test('same slug is allowed across different systems', function (): void {
    Module::factory()->create(['slug' => 'core']);
    $other = Module::factory()->create(['slug' => 'core']);

    expect($other->exists)->toBeTrue();
});

test('module config is cast to array when set', function (): void {
    $module = Module::factory()->create(['config' => ['key' => 'value']]);

    expect($module->config)->toBeArray()
        ->and($module->config['key'])->toBe('value');
});

test('module is_core is cast to boolean', function (): void {
    $module = Module::factory()->core()->create();

    expect($module->is_core)->toBeBool()->toBeTrue();
});

test('module belongs to a system', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    expect($module->system->id)->toBe($system->id);
});

test('system has many modules ordered by sort_order', function (): void {
    $system = System::factory()->create();
    Module::factory()->for($system)->create(['sort_order' => 10, 'slug' => 'expansion']);
    Module::factory()->for($system)->create(['sort_order' => 0, 'slug' => 'core']);

    $slugs = $system->modules->pluck('slug')->all();

    expect($slugs)->toBe(['core', 'expansion']);
});

test('deleting a system cascades to its modules', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    $system->delete();

    expect(Module::query()->find($module->id))->toBeNull();
});

// ── Module::isSubscriber ──────────────────────────────────────────────────────

test('isSubscriber returns true when user has a subscription', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();

    expect($module->isSubscriber($user))->toBeTrue();
});

test('isSubscriber returns false when user has no subscription', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    expect($module->isSubscriber($user))->toBeFalse();
});

// ── Module::isEditor ──────────────────────────────────────────────────────

test('isEditor returns true when user is an editor', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();

    expect($module->isEditor($user))->toBeTrue();
});

test('isEditor returns false when user is not an editor', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    expect($module->isEditor($user))->toBeFalse();
});
