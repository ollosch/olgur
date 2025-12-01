<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\ModuleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property-read int $id
 * @property-read int $system_id
 * @property-read string $type
 * @property-read string $name
 * @property-read string $description
 * @property-read CarbonInterface $created_at
 * @property-read CarbonInterface $updated_at
 */
final class Module extends Model
{
    /** @use HasFactory<ModuleFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    public function casts(): array
    {
        return [
            'id' => 'integer',
            'system_id' => 'integer',
            'type' => 'string',
            'name' => 'string',
            'description' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<System> */
    public function system(): BelongsTo
    {
        return $this->belongsTo(System::class);
    }

    /** @return HasMany<Rule> */
    public function rules(): HasMany
    {
        return $this->hasMany(Rule::class);
    }
}
