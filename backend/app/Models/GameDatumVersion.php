<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\GameDataType;
use Database\Factories\GameDatumVersionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string|null $game_datum_id
 * @property string $module_version_id
 * @property GameDataType $type
 * @property string $slug
 * @property string $name
 * @property array<mixed> $content
 */
#[Fillable(['game_datum_id', 'module_version_id', 'type', 'slug', 'name', 'content'])]
#[WithoutTimestamps]
final class GameDatumVersion extends Model
{
    /** @use HasFactory<GameDatumVersionFactory> */
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
     * @return BelongsTo<GameDatum, $this>
     */
    public function gameDatum(): BelongsTo
    {
        return $this->belongsTo(GameDatum::class);
    }

    /**
     * @return BelongsTo<ModuleVersion, $this>
     */
    public function moduleVersion(): BelongsTo
    {
        return $this->belongsTo(ModuleVersion::class);
    }
}
