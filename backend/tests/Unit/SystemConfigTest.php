<?php

declare(strict_types=1);

use App\Data\SystemConfig;

test('SystemConfig::fromArray defaults proofread_threshold to 3', function (): void {
    $config = SystemConfig::fromArray([]);

    expect($config->proofreadThreshold)->toBe(3)
        ->and($config->proofreadThreshold())->toBe(3);
});

test('SystemConfig::fromArray uses a provided proofread_threshold', function (): void {
    $config = SystemConfig::fromArray(['proofread_threshold' => 5]);

    expect($config->proofreadThreshold)->toBe(5)
        ->and($config->proofreadThreshold())->toBe(5);
});
