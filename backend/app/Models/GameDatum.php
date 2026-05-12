<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\GameDataType;
use Database\Factories\GameDatumFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $module_id
 * @property GameDataType $type
 * @property string $slug
 * @property string $name
 * @property array<mixed> $content
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['module_id', 'type', 'slug', 'name', 'content'])]
final class GameDatum extends Model
{
    /** @use HasFactory<GameDatumFactory> */
    use HasFactory;

    use HasUlids;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => GameDataType::class,
            'content' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Module, $this>
     */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    /**
     * @return HasMany<GameDatumVersion, $this>
     */
    public function gameDatumVersions(): HasMany
    {
        return $this->hasMany(GameDatumVersion::class);
    }
}
