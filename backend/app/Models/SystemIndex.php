<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\SystemIndexFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property-read int $id
 * @property-read int $module_id
 * @property-read string $mpath
 * @property-read string $title
 * @property-read string $content
 * @property-read CarbonInterface $created_at
 * @property-read CarbonInterface $updated_at
 */
final class SystemIndex extends Model
{
    /** @use HasFactory<SystemIndexFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    public function casts(): array
    {
        return [
            'id' => 'integer',
            'system_id' => 'integer',
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
