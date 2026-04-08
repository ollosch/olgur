<?php

declare(strict_types=1);

use App\Models\Module;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertDatabaseMissing;
use function Pest\Laravel\deleteJson;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;

// ── Unauthenticated ──────────────────────────────────────────────────────────

test('unauthenticated requests are rejected', function (string $method, string $path): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $url = str_replace(['{system}', '{module}'], [$system->id, $module->id], $path);

    $this->$method($url)->assertUnauthorized();
})->with([
    'index' => ['getJson',    '/api/me/subscriptions'],
    'store' => ['postJson',   '/api/systems/{system}/modules/{module}/subscribe'],
    'destroy' => ['deleteJson', '/api/systems/{system}/modules/{module}/subscribe'],
]);

// ── index ────────────────────────────────────────────────────────────────────

test('index returns the authenticated user subscriptions', function (): void {
    $user = User::factory()->create();
    Subscription::factory()->for($user)->count(3)->create();
    // Another user's subscriptions should not appear
    Subscription::factory()->count(2)->create();
    actingAs($user);

    $response = getJson('/api/me/subscriptions')->assertSuccessful();

    expect($response->json('data'))->toHaveCount(3);
});

test('index returns empty when user has no subscriptions', function (): void {
    actingAs(User::factory()->create());

    $response = getJson('/api/me/subscriptions')->assertSuccessful();

    expect($response->json('data'))->toBeEmpty();
});

// ── store (subscribe) ────────────────────────────────────────────────────────

test('user can subscribe to a core module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/subscribe')
        ->assertSuccessful();

    $response->assertJsonPath('data.user_id', $user->id);
    $response->assertJsonPath('data.module_id', $module->id);

    assertDatabaseHas('subscriptions', ['user_id' => $user->id, 'module_id' => $module->id]);
});

test('user can subscribe to an expansion when core is subscribed', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->core()->create();
    $expansion = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($core)->create();
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$expansion->id.'/subscribe')
        ->assertSuccessful();

    assertDatabaseHas('subscriptions', ['user_id' => $user->id, 'module_id' => $expansion->id]);
});

test('subscribing twice returns the existing subscription', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    $existing = Subscription::factory()->for($user)->for($module)->create();
    actingAs($user);

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/subscribe')
        ->assertSuccessful();

    $response->assertJsonPath('data.id', $existing->id);
});

test('user cannot subscribe to expansion without core', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Module::factory()->for($system)->core()->create(); // core exists but user not subscribed
    $expansion = Module::factory()->for($system)->create();
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$expansion->id.'/subscribe')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['module_id']);
});

test('store returns 404 for unknown system', function (): void {
    $user = User::factory()->create();
    $module = Module::factory()->create();
    actingAs($user);

    postJson('/api/systems/nonexistent/modules/'.$module->id.'/subscribe')
        ->assertNotFound();
});

test('store returns 404 for unknown module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/nonexistent/subscribe')
        ->assertNotFound();
});

// ── destroy (unsubscribe) ────────────────────────────────────────────────────

test('user can unsubscribe from a module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    Subscription::factory()->for($user)->for($module)->create();
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/subscribe')
        ->assertNoContent();

    assertDatabaseMissing('subscriptions', ['user_id' => $user->id, 'module_id' => $module->id]);
});

test('unsubscribing from core cascades to expansion subscriptions', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->core()->create();
    $expansionA = Module::factory()->for($system)->create();
    $expansionB = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($core)->create();
    Subscription::factory()->for($user)->for($expansionA)->create();
    Subscription::factory()->for($user)->for($expansionB)->create();
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$core->id.'/subscribe')
        ->assertNoContent();

    assertDatabaseMissing('subscriptions', ['user_id' => $user->id, 'module_id' => $core->id]);
    assertDatabaseMissing('subscriptions', ['user_id' => $user->id, 'module_id' => $expansionA->id]);
    assertDatabaseMissing('subscriptions', ['user_id' => $user->id, 'module_id' => $expansionB->id]);
});

test('unsubscribing from expansion does not affect core subscription', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->core()->create();
    $expansion = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($core)->create();
    Subscription::factory()->for($user)->for($expansion)->create();
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$expansion->id.'/subscribe')
        ->assertNoContent();

    assertDatabaseMissing('subscriptions', ['user_id' => $user->id, 'module_id' => $expansion->id]);
    assertDatabaseHas('subscriptions', ['user_id' => $user->id, 'module_id' => $core->id]);
});

test('destroy returns 404 when not subscribed', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/subscribe')
        ->assertNotFound();
});

test('user cannot unsubscribe another user', function (): void {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->core()->create();
    Subscription::factory()->for($other)->for($module)->create();
    actingAs($user);

    // User tries to hit the route for a subscription that belongs to $other.
    // Since the route looks up by auth user, it returns 404 (not found for this user).
    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/subscribe')
        ->assertNotFound();
});
