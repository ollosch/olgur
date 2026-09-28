<?php

declare(strict_types=1);

use App\Http\Requests\StoreProofreadRequest;
use App\Models\GameDatum;
use App\Models\IndexEntry;
use App\Models\Membership;
use App\Models\Module;
use App\Models\Proofread;
use App\Models\Rule;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertDatabaseMissing;
use function Pest\Laravel\deleteJson;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;

/**
 * Create a proofreader member subscribed to the given module.
 */
function proofreaderFor(System $system, Module $module): User
{
    $user = User::factory()->create();
    Membership::factory()->for($user)->for($system)->proofreader()->create();
    Subscription::factory()->for($user)->for($module)->create();

    return $user;
}

// ── index ────────────────────────────────────────────────────────────────────

test('index returns the threshold and an empty proofread map', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $proofreader = proofreaderFor($system, $module);
    actingAs($proofreader);

    getJson('/api/systems/'.$system->id.'/proofreads')
        ->assertOk()
        ->assertJsonPath('data.threshold', 3)
        ->assertJsonPath('data.proofreads', []);
});

test('index returns a custom proofread threshold', function (): void {
    $system = System::factory()->create(['config' => ['proofread_threshold' => 5]]);
    $module = Module::factory()->for($system)->create();
    $proofreader = proofreaderFor($system, $module);
    actingAs($proofreader);

    getJson('/api/systems/'.$system->id.'/proofreads')
        ->assertOk()
        ->assertJsonPath('data.threshold', 5);
});

test('index aggregates counts and flags the current user', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $ruleA = Rule::factory()->for($module)->create();
    $ruleB = Rule::factory()->for($module)->create();
    $me = proofreaderFor($system, $module);
    $other = proofreaderFor($system, $module);

    Proofread::query()->create([
        'user_id' => $me->id,
        'system_id' => $system->id,
        'entity_type' => 'rule',
        'entity_id' => $ruleA->id,
    ]);
    Proofread::query()->create([
        'user_id' => $other->id,
        'system_id' => $system->id,
        'entity_type' => 'rule',
        'entity_id' => $ruleA->id,
    ]);
    Proofread::query()->create([
        'user_id' => $other->id,
        'system_id' => $system->id,
        'entity_type' => 'rule',
        'entity_id' => $ruleB->id,
    ]);

    actingAs($me);

    getJson('/api/systems/'.$system->id.'/proofreads')
        ->assertOk()
        ->assertJsonPath('data.proofreads.'.$ruleA->id.'.count', 2)
        ->assertJsonPath('data.proofreads.'.$ruleA->id.'.me', true)
        ->assertJsonPath('data.proofreads.'.$ruleB->id.'.count', 1)
        ->assertJsonPath('data.proofreads.'.$ruleB->id.'.me', false);
});

test('index is forbidden for subscribers who are not proofreaders', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $subscriber = User::factory()->create();
    Membership::factory()->for($subscriber)->for($system)->create();
    Subscription::factory()->for($subscriber)->for($module)->create();
    actingAs($subscriber);

    getJson('/api/systems/'.$system->id.'/proofreads')->assertForbidden();
});

test('index returns 404 for unknown system', function (): void {
    actingAs(User::factory()->superAdmin()->create());

    getJson('/api/systems/nonexistent/proofreads')->assertNotFound();
});

// ── store ────────────────────────────────────────────────────────────────────

test('a proofreader can proofread a rule', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    $proofreader = proofreaderFor($system, $module);
    actingAs($proofreader);

    postJson('/api/systems/'.$system->id.'/proofreads', [
        'entity_type' => 'rule',
        'entity_id' => $rule->id,
    ])->assertCreated()
        ->assertJsonPath('data.proofreads.'.$rule->id.'.count', 1)
        ->assertJsonPath('data.proofreads.'.$rule->id.'.me', true);

    assertDatabaseHas('proofreads', [
        'user_id' => $proofreader->id,
        'system_id' => $system->id,
        'entity_type' => 'rule',
        'entity_id' => $rule->id,
    ]);
});

test('proofreading is idempotent', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    $proofreader = proofreaderFor($system, $module);
    actingAs($proofreader);

    postJson('/api/systems/'.$system->id.'/proofreads', [
        'entity_type' => 'rule',
        'entity_id' => $rule->id,
    ])->assertCreated();

    postJson('/api/systems/'.$system->id.'/proofreads', [
        'entity_type' => 'rule',
        'entity_id' => $rule->id,
    ])->assertCreated()
        ->assertJsonPath('data.proofreads.'.$rule->id.'.count', 1);

    expect(Proofread::query()->where('entity_id', $rule->id)->count())->toBe(1);
});

test('a super admin can proofread without a membership', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    actingAs(User::factory()->superAdmin()->create());

    postJson('/api/systems/'.$system->id.'/proofreads', [
        'entity_type' => 'rule',
        'entity_id' => $rule->id,
    ])->assertCreated();
});

test('store is forbidden for subscribers who are not proofreaders', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    $subscriber = User::factory()->create();
    Membership::factory()->for($subscriber)->for($system)->create();
    Subscription::factory()->for($subscriber)->for($module)->create();
    actingAs($subscriber);

    postJson('/api/systems/'.$system->id.'/proofreads', [
        'entity_type' => 'rule',
        'entity_id' => $rule->id,
    ])->assertForbidden();
});

test('store rejects an invalid entity type', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    actingAs(proofreaderFor($system, $module));

    postJson('/api/systems/'.$system->id.'/proofreads', [
        'entity_type' => 'bogus',
        'entity_id' => $rule->id,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['entity_type']);
});

test('store rejects an unknown entity id', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    actingAs(proofreaderFor($system, $module));

    postJson('/api/systems/'.$system->id.'/proofreads', [
        'entity_type' => 'rule',
        'entity_id' => Str::ulid(),
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['entity_id']);
});

test('store rejects an entity outside the system', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $otherSystem = System::factory()->create();
    $otherModule = Module::factory()->for($otherSystem)->create();
    $foreignRule = Rule::factory()->for($otherModule)->create();
    actingAs(proofreaderFor($system, $module));

    postJson('/api/systems/'.$system->id.'/proofreads', [
        'entity_type' => 'rule',
        'entity_id' => $foreignRule->id,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['entity_id']);
});

test('store rejects an entity the proofreader cannot view', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    $proofreader = User::factory()->create();
    Membership::factory()->for($proofreader)->for($system)->proofreader()->create();
    actingAs($proofreader);

    postJson('/api/systems/'.$system->id.'/proofreads', [
        'entity_type' => 'rule',
        'entity_id' => $rule->id,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['entity_id']);
});

test('store returns 404 for unknown system', function (): void {
    actingAs(User::factory()->superAdmin()->create());

    postJson('/api/systems/nonexistent/proofreads', [
        'entity_type' => 'rule',
        'entity_id' => Str::ulid(),
    ])->assertNotFound();
});

// ── destroy ──────────────────────────────────────────────────────────────────

test('a proofreader can remove their own proofread', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    $proofreader = proofreaderFor($system, $module);
    Proofread::query()->create([
        'user_id' => $proofreader->id,
        'system_id' => $system->id,
        'entity_type' => 'rule',
        'entity_id' => $rule->id,
    ]);
    actingAs($proofreader);

    deleteJson('/api/systems/'.$system->id.'/proofreads/rule/'.$rule->id)
        ->assertNoContent();

    assertDatabaseMissing('proofreads', [
        'user_id' => $proofreader->id,
        'entity_id' => $rule->id,
    ]);
});

test('destroy returns 404 when the user has no proofread for the entity', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    actingAs(proofreaderFor($system, $module));

    deleteJson('/api/systems/'.$system->id.'/proofreads/rule/'.$rule->id)
        ->assertNotFound();
});

test('destroy validates the route entity type', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    actingAs(proofreaderFor($system, $module));

    deleteJson('/api/systems/'.$system->id.'/proofreads/bogus/'.$rule->id)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['entity_type']);
});

test('destroy returns 404 for unknown system', function (): void {
    actingAs(User::factory()->superAdmin()->create());

    deleteJson('/api/systems/nonexistent/proofreads/rule/'.Str::ulid())
        ->assertNotFound();
});

// ── resolvedEntity guard ─────────────────────────────────────────────────────

test('resolvedEntity throws when the entity does not exist', function (): void {
    $request = StoreProofreadRequest::create('/api/systems/x/proofreads', 'POST', [
        'entity_type' => 'rule',
        'entity_id' => Str::ulid(),
    ]);

    expect(fn (): Rule|IndexEntry|GameDatum => $request->resolvedEntity())
        ->toThrow(NotFoundHttpException::class);
});
