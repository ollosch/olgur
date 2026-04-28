<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

final class RuleImageController
{
    /**
     * Serve a rule image from local storage.
     */
    public function show(string $filename): Response
    {
        abort_unless((bool) preg_match('/^[\w.\-]+\.png$/i', $filename), 404);

        $path = 'rules/images/'.$filename;

        abort_unless(Storage::disk('local')->exists($path), 404);

        /** @var string $contents */
        $contents = Storage::disk('local')->get($path);

        return response($contents, 200, [
            'Content-Type' => 'image/jpeg',
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}
