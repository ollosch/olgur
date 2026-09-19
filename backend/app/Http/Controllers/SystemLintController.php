<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\ScanBrokenLinks;
use App\Http\Resources\BrokenReferenceResource;
use App\Models\System;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

final class SystemLintController
{
    /**
     * Report dangling rule references across the system's live content.
     */
    public function __invoke(System $system, ScanBrokenLinks $scan): AnonymousResourceCollection
    {
        Gate::authorize('lint', $system);

        return BrokenReferenceResource::collection($scan->execute($system));
    }
}
