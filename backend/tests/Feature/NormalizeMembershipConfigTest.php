<?php

declare(strict_types=1);

use App\Actions\NormalizeMembershipConfig;
use App\Data\MembershipConfig;
use App\Enums\GameDataType;
use App\Models\GameDatum;
use App\Models\Membership;
use App\Models\Module;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;
use Illuminate\Validation\ValidationException;

function normalize(Membership $membership, User $user, MembershipConfig $config): MembershipConfig
{
    return resolve(NormalizeMembershipConfig::class)->execute($membership, $user, $config);
}

test('normalize preserves distinct subscribed non-core active modules', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($moduleA)->create();
    Subscription::factory()->for($user)->for($moduleB)->create();
    $membership = Membership::factory()->for($user)->for($system)->create();

    $config = normalize($membership, $user, MembershipConfig::fromArray([
        'active_module_ids' => [$moduleA->id, $moduleB->id],
    ]));

    expect($config->activeModuleIds)->toBe([$moduleA->id, $moduleB->id]);
});

test('normalize rejects duplicate active modules', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();
    $membership = Membership::factory()->for($user)->for($system)->create();

    expect(fn (): MembershipConfig => normalize($membership, $user, MembershipConfig::fromArray([
        'active_module_ids' => [$module->id, $module->id],
    ])))->toThrow(ValidationException::class);
});

test('normalize rejects active modules outside the system', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $foreign = Module::factory()->create();
    Subscription::factory()->for($user)->for($foreign)->create();
    $membership = Membership::factory()->for($user)->for($system)->create();

    expect(fn (): MembershipConfig => normalize($membership, $user, MembershipConfig::fromArray([
        'active_module_ids' => [$foreign->id],
    ])))->toThrow(ValidationException::class);
});

test('normalize rejects core modules in active_module_ids', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $core = Module::factory()->for($system)->core()->create();
    Subscription::factory()->for($user)->for($core)->create();
    $membership = Membership::factory()->for($user)->for($system)->create();

    expect(fn (): MembershipConfig => normalize($membership, $user, MembershipConfig::fromArray([
        'active_module_ids' => [$core->id],
    ])))->toThrow(ValidationException::class);
});

test('normalize rejects active modules the user is not subscribed to', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $membership = Membership::factory()->for($user)->for($system)->create();

    expect(fn (): MembershipConfig => normalize($membership, $user, MembershipConfig::fromArray([
        'active_module_ids' => [$module->id],
    ])))->toThrow(ValidationException::class);
});

test('normalize allows multiple active expansions in a non-global system', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->withoutGlobalRuleNumbers()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($moduleA)->create();
    Subscription::factory()->for($user)->for($moduleB)->create();
    $membership = Membership::factory()->for($user)->for($system)->create();

    $config = normalize($membership, $user, MembershipConfig::fromArray([
        'active_module_ids' => [$moduleA->id, $moduleB->id],
    ]));

    expect($config->activeModuleIds)->toBe([$moduleA->id, $moduleB->id]);
});

test('normalize allows multiple active expansions in a global system', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->withGlobalRuleNumbers()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($moduleA)->create();
    Subscription::factory()->for($user)->for($moduleB)->create();
    $membership = Membership::factory()->for($user)->for($system)->create();

    $config = normalize($membership, $user, MembershipConfig::fromArray([
        'active_module_ids' => [$moduleA->id, $moduleB->id],
    ]));

    expect($config->activeModuleIds)->toBe([$moduleA->id, $moduleB->id]);
});

test('normalize allows multiple active expansions in a system without global rule numbers', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->withoutGlobalRuleNumbers()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($moduleA)->create();
    Subscription::factory()->for($user)->for($moduleB)->create();
    $membership = Membership::factory()->for($user)->for($system)->create();

    $config = normalize($membership, $user, MembershipConfig::fromArray([
        'active_module_ids' => [$moduleA->id, $moduleB->id],
    ]));

    expect($config->activeModuleIds)->toBe([$moduleA->id, $moduleB->id]);
});

test('normalize clears a selected SOP module that is not active', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    GameDatum::factory()->for($module)->create(['type' => GameDataType::Sop]);
    $membership = Membership::factory()->for($user)->for($system)->create();

    $config = normalize($membership, $user, MembershipConfig::fromArray([
        'selected_sop_module_id' => $module->id,
    ]));

    expect($config->selectedSopModuleId)->toBeNull();
});

test('normalize clears a selected SOP module that does not provide an SOP', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();
    $membership = Membership::factory()->for($user)->for($system)->create();

    $config = normalize($membership, $user, MembershipConfig::fromArray([
        'active_module_ids' => [$module->id],
        'selected_sop_module_id' => $module->id,
    ]));

    expect($config->selectedSopModuleId)->toBeNull();
});

test('normalize keeps a selected SOP module that is active and provides an SOP', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    GameDatum::factory()->for($module)->create(['type' => GameDataType::Sop]);
    Subscription::factory()->for($user)->for($module)->create();
    $membership = Membership::factory()->for($user)->for($system)->create();

    $config = normalize($membership, $user, MembershipConfig::fromArray([
        'active_module_ids' => [$module->id],
        'selected_sop_module_id' => $module->id,
    ]));

    expect($config->selectedSopModuleId)->toBe($module->id);
});

test('normalize keeps a selected SOP core module that provides an SOP', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->withoutGlobalRuleNumbers()->create();
    $core = Module::factory()->for($system)->core()->create();
    GameDatum::factory()->for($core)->create(['type' => GameDataType::Sop]);
    Subscription::factory()->for($user)->for($core)->create();
    $membership = Membership::factory()->for($user)->for($system)->create();

    $config = normalize($membership, $user, MembershipConfig::fromArray([
        'active_module_ids' => [],
        'selected_sop_module_id' => $core->id,
    ]));

    expect($config->selectedSopModuleId)->toBe($core->id);
});
