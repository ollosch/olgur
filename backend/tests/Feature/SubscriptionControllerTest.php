<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Module;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertDatabaseMissing;
use function Pest\Laravel\deleteJson;
use function Pest\Laravel\getJson;
use function Pest\Laravel\patchJson;
use function Pest\Laravel\postJson;

// ── Helpers ───────────────────────────────────────────────────────────────────

function subscriptionUrl(System $system, Module $module, ?Subscription $subscription = null): string
{
    $base = '/api/systems/'.$system->id.'/modules/'.$module->id.'/subscriptions';

    return $subscription instanceof Subscription ? $base.'/'.$subscription->id : $base;
}

// ── Unauthenticated ──────────────────────────────────────────────────────────

test('unauthenticated requests are rejected', function (string $method, string $path): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $subscription = Subscription::factory()->for($module)->create();
    $url = str_replace(
        ['{system}', '{module}', '{subscription}'],
        [$system->id, $module->id, $subscription->id],
        $path,
    );

    $this->$method($url)->assertUnauthorized();
})->with([
    'index' => ['getJson',    '/api/systems/{system}/modules/{module}/subscriptions'],
    'store' => ['postJson',   '/api/systems/{system}/modules/{module}/subscriptions'],
    'update' => ['patchJson',  '/api/systems/{system}/modules/{module}/subscriptions/{subscription}'],
    'destroy' => ['deleteJson', '/api/systems/{system}/modules/{module}/subscriptions/{subscription}'],
]);

// ── module subscriptions index ───────────────────────────────────────────────

test('system admin can list all subscriptions for a module', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    $module = Module::factory()->for($system)->core()->create();
    Subscription::factory()->for($module)->count(3)->create();
    actingAs($admin);

    $response = getJson(subscriptionUrl($system, $module))->assertSuccessful();

    expect($response->json('data'))->toHaveCount(3);
});

test('module editor can list all subscriptions for a module', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    $editor = User::factory()->create();
    Subscription::factory()->for($editor)->for($module)->create(['editor' => true]);
    Subscription::factory()->for($module)->count(2)->create();
    actingAs($editor);

    $response = getJson(subscriptionUrl($system, $module))->assertSuccessful();

    expect($response->json('data'))->toHaveCount(3);
});

test('regular subscriber cannot list all subscriptions for a module', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    $user = User::factory()->create();
    Subscription::factory()->for($user)->for($module)->create(['editor' => false]);
    actingAs($user);

    getJson(subscriptionUrl($system, $module))->assertForbidden();
});

test('non-subscriber cannot list subscriptions for a module', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    actingAs(User::factory()->create());

    getJson(subscriptionUrl($system, $module))->assertForbidden();
});

// ── store (subscribe) ────────────────────────────────────────────────────────

test('user cannot subscribe themselves to a module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    actingAs($user);

    postJson(subscriptionUrl($system, $module))->assertForbidden();
});

test('system admin can subscribe another user to a module', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    $member = User::factory()->create();
    Membership::factory()->for($member)->for($system)->create();
    $module = Module::factory()->for($system)->core()->create();
    actingAs($admin);

    $response = postJson(subscriptionUrl($system, $module), ['user_id' => $member->id])
        ->assertSuccessful();

    $response->assertJsonPath('data.user_id', $member->id);
    assertDatabaseHas('subscriptions', ['user_id' => $member->id, 'module_id' => $module->id]);
});

test('regular user cannot subscribe another user to a module', function (): void {
    $system = System::factory()->create();
    $user = User::factory()->create();
    $other = User::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    actingAs($user);

    postJson(subscriptionUrl($system, $module), ['user_id' => $other->id])->assertForbidden();
});

test('system admin can subscribe a member to an expansion when they have the core subscription', function (): void {
    $user = User::factory()->create();
    $admin = User::factory()->create();
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->core()->create();
    $expansion = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($core)->create();
    Membership::factory()->for($user)->for($system)->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    actingAs($admin);

    postJson(subscriptionUrl($system, $expansion), ['user_id' => $user->id])->assertSuccessful();

    assertDatabaseHas('subscriptions', ['user_id' => $user->id, 'module_id' => $expansion->id]);
});

test('system admin can subscribe a member to an expansion without core subscription in grouping only systems', function (): void {
    $user = User::factory()->create();
    $admin = User::factory()->create();
    $system = System::factory()->create(); // no require_core_subscription config
    $expansion = Module::factory()->for($system)->create(); // not core
    Membership::factory()->for($user)->for($system)->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    actingAs($admin);

    postJson(subscriptionUrl($system, $expansion), ['user_id' => $user->id])->assertSuccessful();
});

test('system admin cannot subscribe a member to an expansion without core subscription in core plus many systems', function (): void {
    $user = User::factory()->create();
    $admin = User::factory()->create();
    $system = System::factory()->corePlusMany()->create();
    Module::factory()->for($system)->core()->create(); // core module exists
    $expansion = Module::factory()->for($system)->create();
    Membership::factory()->for($user)->for($system)->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    actingAs($admin);

    postJson(subscriptionUrl($system, $expansion), ['user_id' => $user->id])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['module_id']);
});

test('system admin can subscribe a member to an expansion when core plus many has no core module', function (): void {
    $user = User::factory()->create();
    $admin = User::factory()->create();
    $system = System::factory()->corePlusMany()->create();
    $expansion = Module::factory()->for($system)->create(); // no core module exists
    Membership::factory()->for($user)->for($system)->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    actingAs($admin);

    postJson(subscriptionUrl($system, $expansion), ['user_id' => $user->id])->assertSuccessful();
});

test('system admin cannot subscribe a user who is not a member', function (): void {
    $user = User::factory()->create();
    $admin = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    actingAs($admin);

    postJson(subscriptionUrl($system, $module), ['user_id' => $user->id])->assertUnprocessable();
});

test('subscribing twice returns 409', function (): void {
    $user = User::factory()->create();
    $admin = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    Subscription::factory()->for($user)->for($module)->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    actingAs($admin);

    postJson(subscriptionUrl($system, $module), ['user_id' => $user->id])
        ->assertConflict();
});

test('store returns 404 for unknown system', function (): void {
    $module = Module::factory()->create();
    actingAs(User::factory()->create());

    postJson('/api/systems/nonexistent/modules/'.$module->id.'/subscriptions')->assertNotFound();
});

test('store returns 404 for unknown module', function (): void {
    $system = System::factory()->create();
    actingAs(User::factory()->create());

    postJson('/api/systems/'.$system->id.'/modules/nonexistent/subscriptions')->assertNotFound();
});

// ── update (toggle editor) ───────────────────────────────────────────────────

test('system admin can promote a subscription to editor', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    $member = User::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    $subscription = Subscription::factory()->for($member)->for($module)->create(['editor' => false]);
    actingAs($admin);

    patchJson(subscriptionUrl($system, $module, $subscription), ['editor' => true])
        ->assertSuccessful()
        ->assertJsonPath('data.editor', true);

    assertDatabaseHas('subscriptions', ['id' => $subscription->id, 'editor' => true]);
});

test('system admin can demote a subscription from editor', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    $member = User::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    $subscription = Subscription::factory()->for($member)->for($module)->create(['editor' => true]);
    actingAs($admin);

    patchJson(subscriptionUrl($system, $module, $subscription), ['editor' => false])
        ->assertSuccessful()
        ->assertJsonPath('data.editor', false);

    assertDatabaseHas('subscriptions', ['id' => $subscription->id, 'editor' => false]);
});

test('update requires editor field', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    $member = User::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    $subscription = Subscription::factory()->for($member)->for($module)->create();
    actingAs($admin);

    patchJson(subscriptionUrl($system, $module, $subscription), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['editor']);
});

test('regular user cannot update a subscription', function (): void {
    $system = System::factory()->create();
    $user = User::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    $subscription = Subscription::factory()->for($user)->for($module)->create();
    actingAs($user);

    patchJson(subscriptionUrl($system, $module, $subscription), ['editor' => true])->assertForbidden();
});

test('update returns 404 for unknown subscription', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    $module = Module::factory()->for($system)->core()->create();
    actingAs($admin);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/subscriptions/nonexistent', ['editor' => true])
        ->assertNotFound();
});

// ── destroy (unsubscribe) ────────────────────────────────────────────────────

test('user can unsubscribe themselves from a module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    $subscription = Subscription::factory()->for($user)->for($module)->create();
    actingAs($user);

    deleteJson(subscriptionUrl($system, $module, $subscription))->assertNoContent();

    assertDatabaseMissing('subscriptions', ['user_id' => $user->id, 'module_id' => $module->id]);
});

test('unsubscribing from core does not cascade to expansion subscriptions', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->corePlusMany()->create();
    $core = Module::factory()->for($system)->core()->create();
    $expansionA = Module::factory()->for($system)->create();
    $expansionB = Module::factory()->for($system)->create();
    $coreSubscription = Subscription::factory()->for($user)->for($core)->create();
    Subscription::factory()->for($user)->for($expansionA)->create();
    Subscription::factory()->for($user)->for($expansionB)->create();
    actingAs($user);

    deleteJson(subscriptionUrl($system, $core, $coreSubscription))->assertNoContent();

    assertDatabaseMissing('subscriptions', ['user_id' => $user->id, 'module_id' => $core->id]);
    assertDatabaseHas('subscriptions', ['user_id' => $user->id, 'module_id' => $expansionA->id]);
    assertDatabaseHas('subscriptions', ['user_id' => $user->id, 'module_id' => $expansionB->id]);
});

test('unsubscribing from expansion does not affect core subscription', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->core()->create();
    $expansion = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($core)->create();
    $expansionSubscription = Subscription::factory()->for($user)->for($expansion)->create();
    actingAs($user);

    deleteJson(subscriptionUrl($system, $expansion, $expansionSubscription))->assertNoContent();

    assertDatabaseMissing('subscriptions', ['user_id' => $user->id, 'module_id' => $expansion->id]);
    assertDatabaseHas('subscriptions', ['user_id' => $user->id, 'module_id' => $core->id]);
});

test('user cannot unsubscribe another user', function (): void {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    $subscription = Subscription::factory()->for($other)->for($module)->create();
    actingAs($user);

    deleteJson(subscriptionUrl($system, $module, $subscription))->assertForbidden();
});

test('system admin can unsubscribe another user', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    $member = User::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    $subscription = Subscription::factory()->for($member)->for($module)->create();
    actingAs($admin);

    deleteJson(subscriptionUrl($system, $module, $subscription))->assertNoContent();

    assertDatabaseMissing('subscriptions', ['id' => $subscription->id]);
});

test('destroy returns 404 for unknown subscription', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/subscriptions/nonexistent')
        ->assertNotFound();
});

test('unsubscribing from core does not cascade when require_core_subscription is absent', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create(); // no require_core_subscription in config
    $core = Module::factory()->for($system)->core()->create();
    $expansion = Module::factory()->for($system)->create();
    $coreSubscription = Subscription::factory()->for($user)->for($core)->create();
    Subscription::factory()->for($user)->for($expansion)->create();
    actingAs($user);

    deleteJson(subscriptionUrl($system, $core, $coreSubscription))->assertNoContent();

    assertDatabaseMissing('subscriptions', ['user_id' => $user->id, 'module_id' => $core->id]);
    assertDatabaseHas('subscriptions', ['user_id' => $user->id, 'module_id' => $expansion->id]);
});

// ── Feature 10: active_module_ids cleanup on unsubscribe ─────────────────────

test('unsubscribing from an active expansion removes it from active_module_ids', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->core()->create();
    $expansion = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($core)->create();
    $expansionSubscription = Subscription::factory()->for($user)->for($expansion)->create();
    Membership::factory()->for($user)->for($system)->create([
        'config' => ['active_module_ids' => [$expansion->id]],
    ]);
    actingAs($user);

    deleteJson(subscriptionUrl($system, $expansion, $expansionSubscription))->assertNoContent();

    $membership = Membership::query()
        ->where('user_id', $user->id)
        ->where('system_id', $system->id)
        ->first();

    expect($membership)->not->toBeNull();
    expect($membership?->config?->activeModuleIds ?? [])->not->toContain($expansion->id);
});

test('unsubscribing from an inactive expansion does not crash', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->core()->create();
    $expansion = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($core)->create();
    $expansionSubscription = Subscription::factory()->for($user)->for($expansion)->create();
    Membership::factory()->for($user)->for($system)->create([
        'config' => ['active_module_ids' => []],
    ]);
    actingAs($user);

    deleteJson(subscriptionUrl($system, $expansion, $expansionSubscription))->assertNoContent();

    $membership = Membership::query()
        ->where('user_id', $user->id)
        ->where('system_id', $system->id)
        ->first();

    expect($membership)->not->toBeNull();
    expect($membership?->config?->activeModuleIds ?? [])->toBeEmpty();
});

test('unsubscribing from core does not clear active_module_ids', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->corePlusMany()->create();
    $core = Module::factory()->for($system)->core()->create();
    $expansionA = Module::factory()->for($system)->create();
    $expansionB = Module::factory()->for($system)->create();
    $coreSubscription = Subscription::factory()->for($user)->for($core)->create();
    Subscription::factory()->for($user)->for($expansionA)->create();
    Subscription::factory()->for($user)->for($expansionB)->create();
    Membership::factory()->for($user)->for($system)->create([
        'config' => ['active_module_ids' => [$expansionA->id, $expansionB->id]],
    ]);
    actingAs($user);

    deleteJson(subscriptionUrl($system, $core, $coreSubscription))->assertNoContent();

    $membership = Membership::query()
        ->where('user_id', $user->id)
        ->where('system_id', $system->id)
        ->first();

    expect($membership)->not->toBeNull();
    expect($membership?->config?->activeModuleIds ?? [])->toContain($expansionA->id);
    expect($membership?->config?->activeModuleIds ?? [])->toContain($expansionB->id);
});

test('subscribing to expansion in core_plus_one system auto-subscribes to core', function (): void {
    $user = User::factory()->create();
    $admin = User::factory()->create();
    $system = System::factory()->corePlusOne()->create();
    $core = Module::factory()->for($system)->core()->create();
    $expansion = Module::factory()->for($system)->create();
    Membership::factory()->for($user)->for($system)->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    actingAs($admin);

    postJson(subscriptionUrl($system, $expansion), ['user_id' => $user->id])->assertSuccessful();

    assertDatabaseHas('subscriptions', ['user_id' => $user->id, 'module_id' => $expansion->id]);
    assertDatabaseHas('subscriptions', ['user_id' => $user->id, 'module_id' => $core->id]);
});

test('unsubscribing when membership does not exist does not throw', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $expansion = Module::factory()->for($system)->create();
    $subscription = Subscription::factory()->for($user)->for($expansion)->create();
    // No membership record created
    actingAs($user);

    deleteJson(subscriptionUrl($system, $expansion, $subscription))->assertNoContent();
});

test('unsubscribing preserves other config keys like bookmarks', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $expansion = Module::factory()->for($system)->create();
    $subscription = Subscription::factory()->for($user)->for($expansion)->create();
    $bookmark = ['type' => 'rule', 'id' => 'abcdefghijklmnopqrstuvwxyz'];
    Membership::factory()->for($user)->for($system)->create([
        'config' => ['active_module_ids' => [$expansion->id], 'bookmarks' => [$bookmark]],
    ]);
    actingAs($user);

    deleteJson(subscriptionUrl($system, $expansion, $subscription))->assertNoContent();

    $membership = Membership::query()
        ->where('user_id', $user->id)
        ->where('system_id', $system->id)
        ->first();

    expect($membership?->config?->bookmarks ?? [])->toBe([$bookmark]);
});
