<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\RuleFactory;
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
final class Rule extends Model
{
    /** @use HasFactory<RuleFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    public function casts(): array
    {
        return [
            'id' => 'integer',
            'module_id' => 'integer',
            'mpath' => 'string',
            'title' => 'string',
            'content' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Module> */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }
}
