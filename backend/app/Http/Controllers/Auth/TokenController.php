<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class TokenController
{
    /**
     * Issue a personal API token for the authenticated user.
     */
    public function store(LoginRequest $request): JsonResponse
    {
        $request->authenticate();

        $token = $request->user()->createToken('auth_token');

        return response()->json([
            'token' => $token->plainTextToken,
        ], 201);
    }

    /**
     * Revoke all tokens for the authenticated user.
     */
    public function destroy(Request $request): Response
    {
        $request->user()->tokens()->delete();

        return response()->noContent();
    }
}
