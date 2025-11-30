<?php

declare(strict_types=1);

test('new users can register', function (): void {
    $credentials = [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ];

    $response = $this->post(route('register'), $credentials);

    $response->assertCreated();
    $this->assertDatabaseHas('users', [
        'name' => $credentials['name'],
        'email' => $credentials['email'],
    ]);
});
