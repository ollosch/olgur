<?php

declare(strict_types=1);

use App\Models\Module;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\QueryException;

test('a subscription can be created with factory defaults', function (): void {
    $subscription = Subscription::factory()->create();

    expect($subscription->id)->toBeString()
        ->and($subscription->user_id)->toBeString()
        ->and($subscription->module_id)->toBeString()
        ->and($subscription->editor)->toBeFalse();
});

test('subscription uses ulid primary key', function (): void {
    $subscription = Subscription::factory()->create();

    expect($subscription->id)->toBeString()->toHaveLength(26);
});

test('subscription editor is cast to boolean', function (): void {
    $subscription = Subscription::factory()->editor()->create();

    expect($subscription->editor)->toBeBool()->toBeTrue();
});

test('subscription belongs to a user', function (): void {
    $user = User::factory()->create();
    $subscription = Subscription::factory()->for($user)->create();

    expect($subscription->user->id)->toBe($user->id);
});

test('subscription belongs to a module', function (): void {
    $module = Module::factory()->create();
    $subscription = Subscription::factory()->for($module)->create();

    expect($subscription->module->id)->toBe($module->id);
});

test('a user can only subscribe to a module once', function (): void {
    $user = User::factory()->create();
    $module = Module::factory()->create();
    Subscription::factory()->for($user)->for($module)->create();

    expect(fn () => Subscription::factory()->for($user)->for($module)->create())
        ->toThrow(QueryException::class);
});

test('same user can subscribe to multiple modules', function (): void {
    $user = User::factory()->create();
    $subA = Subscription::factory()->for($user)->create();
    $subB = Subscription::factory()->for($user)->create();

    expect($subA->exists)->toBeTrue()
        ->and($subB->exists)->toBeTrue()
        ->and($subA->module_id)->not->toBe($subB->module_id);
});

test('user has many subscriptions', function (): void {
    $user = User::factory()->create();
    Subscription::factory()->for($user)->count(3)->create();

    expect($user->subscriptions)->toHaveCount(3);
});

test('module has many subscriptions', function (): void {
    $module = Module::factory()->create();
    Subscription::factory()->for($module)->count(2)->create();

    expect($module->subscriptions)->toHaveCount(2)
        ->and($module->subscriptions->first())->toBeInstanceOf(Subscription::class);
});

test('deleting a user cascades to their subscriptions', function (): void {
    $user = User::factory()->create();
    $subscription = Subscription::factory()->for($user)->create();

    $user->delete();

    expect(Subscription::query()->find($subscription->id))->toBeNull();
});

test('deleting a module cascades to its subscriptions', function (): void {
    $module = Module::factory()->create();
    $subscription = Subscription::factory()->for($module)->create();

    $module->delete();

    expect(Subscription::query()->find($subscription->id))->toBeNull();
});
