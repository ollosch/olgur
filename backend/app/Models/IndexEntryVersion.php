<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\IndexEntryVersionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string|null $index_entry_id
 * @property string $module_version_id
 * @property string|null $parent_id
 * @property string $term
 * @property string|null $definition
 * @property string|null $notes
 * @property array<int|string, mixed>|null $relations
 */
#[Fillable(['index_entry_id', 'module_version_id', 'parent_id', 'term', 'definition', 'notes', 'relations'])]
final class IndexEntryVersion extends Model
{
    /** @use HasFactory<IndexEntryVersionFactory> */
    use HasFactory;

    use HasUlids;

    public $timestamps = false;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'relations' => 'array',
        ];
    }

    /**
     * @return BelongsTo<IndexEntry, $this>
     */
    public function indexEntry(): BelongsTo
    {
        return $this->belongsTo(IndexEntry::class);
    }

    /**
     * @return BelongsTo<ModuleVersion, $this>
     */
    public function moduleVersion(): BelongsTo
    {
        return $this->belongsTo(ModuleVersion::class);
    }

    /**
     * @return BelongsTo<IndexEntryVersion, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * @return HasMany<IndexEntryVersion, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }
}
