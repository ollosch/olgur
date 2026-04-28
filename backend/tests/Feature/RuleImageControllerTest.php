<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\get;

beforeEach(function (): void {
    Storage::fake('local');
});

test('returns a png image when the file exists', function (): void {
    Storage::disk('local')->put('rules/images/C.6.5.png', 'fake-image-data');

    get('/api/rules/images/C.6.5.png')
        ->assertSuccessful()
        ->assertHeader('Content-Type', 'image/png');
});

test('returns 404 when the file does not exist', function (): void {
    get('/api/rules/images/C.6.5.png')->assertNotFound();
});

test('returns 404 for filenames with path traversal', function (string $filename): void {
    get('/api/rules/images/'.$filename)->assertNotFound();
})->with([
    '../secret.png',
    'foo/bar.png',
    'foo%2Fbar.png',
]);

test('does not require authentication', function (): void {
    Storage::disk('local')->put('rules/images/A.1.1.png', 'fake-image-data');

    get('/api/rules/images/A.1.1.png')->assertSuccessful();
});
