<?php

declare(strict_types=1);

use App\Models\Module;
use App\Models\Permission;
use App\Providers\AppServiceProvider;

arch()->preset()->php();

arch()->preset()->strict()
    ->ignoring(Permission::class)
    ->ignoring(Module::class);

arch()->preset()->security()
    ->ignoring(AppServiceProvider::class);

arch('controllers')
    ->expect('App\Http\Controllers')
    ->not->toBeUsed();
