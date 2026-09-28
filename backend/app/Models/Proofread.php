<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ProofreadFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $user_id
 * @property string $system_id
 * @property string $entity_type
 * @property string $entity_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['user_id', 'system_id', 'entity_type', 'entity_id'])]
#[Table(name: 'proofreads')]
final class Proofread extends Model
{
    /** @use HasFactory<ProofreadFactory> */
    use HasFactory;

    use HasUlids;

    public const string ENTITY_TYPE_RULE = 'rule';

    public const string ENTITY_TYPE_INDEX_ENTRY = 'index_entry';

    public const string ENTITY_TYPE_GAME_DATUM = 'game_datum';

    /**
     * The entity types a proofread can target.
     *
     * @var list<string>
     */
    public const array ENTITY_TYPES = [
        self::ENTITY_TYPE_RULE,
        self::ENTITY_TYPE_INDEX_ENTRY,
        self::ENTITY_TYPE_GAME_DATUM,
    ];

    /**
     * Resolve the target entity for a proofread, keyed by entity type.
     */
    public static function resolveEntity(string $entityType, string $entityId): Rule|IndexEntry|GameDatum|null
    {
        return match ($entityType) {
            self::ENTITY_TYPE_RULE => Rule::query()->find($entityId),
            self::ENTITY_TYPE_INDEX_ENTRY => IndexEntry::query()->find($entityId),
            self::ENTITY_TYPE_GAME_DATUM => GameDatum::query()->find($entityId),
            default => null,
        };
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
