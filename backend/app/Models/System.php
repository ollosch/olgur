<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\SystemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property-read int $id
 * @property-read int $owner_id
 * @property-read string $name
 * @property-read string $description
 * @property-read CarbonInterface $created_at
 * @property-read CarbonInterface $updated_at
 */
final class System extends Model
{
    /** @use HasFactory<SystemFactory> */
    use HasFactory;

    public static function boot()
    {
        parent::boot();

        static::created(function (System $system): void {
            $system->modules()->create([
                'system_id' => $system->id,
                'type' => 'core',
                'name' => 'Core Module',
                'description' => 'This is the core module created automatically with the system.',
            ]);
        });
    }

    /**
     * @return array<string, string>
     */
    public function casts(): array
    {
        return [
            'id' => 'integer',
            'owner_id' => 'integer',
            'name' => 'string',
            'description' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /** @return HasMany<Module> */
    public function modules(): HasMany
    {
        return $this->hasMany(Module::class);
    }
}
