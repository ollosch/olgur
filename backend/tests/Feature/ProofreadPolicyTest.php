<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Module;
use App\Models\Proofread;
use App\Models\Rule;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;
use App\Policies\ProofreadPolicy;

/**
 * Create a member with the given flags, optionally subscribed to a module.
 */
function makePolicyUser(System $system, bool $admin = false, bool $proofreader = false, ?Module $module = null): User
{
    $user = User::factory()->create();
    Membership::factory()->for($user)->for($system)->create([
        'admin' => $admin,
        'proofreader' => $proofreader,
    ]);

    if ($module instanceof Module) {
        Subscription::factory()->for($user)->for($module)->create();
    }

    return $user;
}

test('viewAny allows system admins', function (): void {
    $system = System::factory()->create();
    $user = makePolicyUser($system, admin: true);

    expect((new ProofreadPolicy())->viewAny($user, $system))->toBeTrue();
});

test('viewAny allows proofreaders', function (): void {
    $system = System::factory()->create();
    $user = makePolicyUser($system, proofreader: true);

    expect((new ProofreadPolicy())->viewAny($user, $system))->toBeTrue();
});

test('viewAny denies plain members', function (): void {
    $system = System::factory()->create();
    $user = makePolicyUser($system);

    expect((new ProofreadPolicy())->viewAny($user, $system))->toBeFalse();
});

test('view mirrors the system role', function (): void {
    $system = System::factory()->create();
    $proofreader = makePolicyUser($system, proofreader: true);
    $member = makePolicyUser($system);

    $policy = new ProofreadPolicy();

    expect($policy->view($proofreader, $system))->toBeTrue()
        ->and($policy->view($member, $system))->toBeFalse();
});

test('create allows a proofreader who can view the module', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $user = makePolicyUser($system, proofreader: true, module: $module);

    expect((new ProofreadPolicy())->create($user, $system, $module))->toBeTrue();
});

test('create denies a proofreader who cannot view the module', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $user = makePolicyUser($system, proofreader: true);

    expect((new ProofreadPolicy())->create($user, $system, $module))->toBeFalse();
});

test('create denies a plain member', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $user = makePolicyUser($system, module: $module);

    expect((new ProofreadPolicy())->create($user, $system, $module))->toBeFalse();
});

test('delete allows a proofreader removing their own proofread', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    $user = makePolicyUser($system, proofreader: true, module: $module);
    $proofread = Proofread::query()->create([
        'user_id' => $user->id,
        'system_id' => $system->id,
        'entity_type' => 'rule',
        'entity_id' => $rule->id,
    ]);

    expect((new ProofreadPolicy())->delete($user, $proofread, $system, $module))->toBeTrue();
});

test('delete denies removing another user proofread', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    $owner = makePolicyUser($system, proofreader: true, module: $module);
    $intruder = makePolicyUser($system, proofreader: true, module: $module);
    $proofread = Proofread::query()->create([
        'user_id' => $owner->id,
        'system_id' => $system->id,
        'entity_type' => 'rule',
        'entity_id' => $rule->id,
    ]);

    expect((new ProofreadPolicy())->delete($intruder, $proofread, $system, $module))->toBeFalse();
});

test('delete denies a plain member', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    $user = makePolicyUser($system, module: $module);
    $proofread = Proofread::query()->create([
        'user_id' => $user->id,
        'system_id' => $system->id,
        'entity_type' => 'rule',
        'entity_id' => $rule->id,
    ]);

    expect((new ProofreadPolicy())->delete($user, $proofread, $system, $module))->toBeFalse();
});

test('delete denies a proofreader who cannot view the module', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    $user = makePolicyUser($system, proofreader: true);
    $proofread = Proofread::query()->create([
        'user_id' => $user->id,
        'system_id' => $system->id,
        'entity_type' => 'rule',
        'entity_id' => $rule->id,
    ]);

    expect((new ProofreadPolicy())->delete($user, $proofread, $system, $module))->toBeFalse();
});
