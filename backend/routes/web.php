<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('api')->group(function() {
    Route::get('/me', function (Request $request) {
        return $request->user();
    })->middleware('auth');
});
