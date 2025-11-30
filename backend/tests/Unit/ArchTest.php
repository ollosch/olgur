<?php

declare(strict_types=1);

arch()->preset()->php();
arch()->preset()->strict();
arch()->preset()->security()
  ->ignoring('App\Providers\AppServiceProvider');

arch('controllers')
    ->expect('App\Http\Controllers')
    ->not->toBeUsed();
