<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\IndexEntryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['module_id', 'parent_id', 'term', 'definition', 'notes', 'relations'])]
final class IndexEntry extends Model
{
    /** @use HasFactory<IndexEntryFactory> */
    use HasFactory;

    use HasUlids;

    /**
     * @return BelongsTo<Module, $this>
     */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    /**
     * @return BelongsTo<IndexEntry, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * @return HasMany<IndexEntry, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }

    /**
     * @return HasMany<IndexEntryVersion, $this>
     */
    public function indexEntryVersions(): HasMany
    {
        return $this->hasMany(IndexEntryVersion::class);
    }

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
}
