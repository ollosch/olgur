<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\SystemIndexFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property-read string $id
 * @property-read string $module_id
 * @property-read string $mpath
 * @property-read string $title
 * @property-read string $content
 * @property-read CarbonInterface $created_at
 * @property-read CarbonInterface $updated_at
 */
final class SystemIndex extends Model
{
    /** @use HasFactory<SystemIndexFactory> */
    use HasFactory, HasUlids;

    /**
     * @return array<string, string>
     */
    public function casts(): array
    {
        return [
            'id' => 'string',
            'system_id' => 'string',
            'term' => 'string',
            'definition' => 'string',
            'references' => 'string',
            'links' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

        /** @return BelongsTo<System> */
    public function system(): BelongsTo
    {
        return $this->belongsTo(System::class);
    }
}
