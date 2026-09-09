<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ModuleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $system_id
 * @property string $slug
 * @property string $name
 * @property string $description
 * @property array<string, mixed> $config
 * @property bool $is_core
 * @property int $sort_order
 * @property int $draft_revision
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['system_id', 'slug', 'name', 'description', 'config', 'is_core', 'sort_order'])]
final class Module extends Model
{
    /** @use HasFactory<ModuleFactory> */
    use HasFactory;

    use HasUlids;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'config' => 'array',
            'is_core' => 'boolean',
            'sort_order' => 'integer',
            'draft_revision' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<System, $this>
     */
    public function system(): BelongsTo
    {
        return $this->belongsTo(System::class);
    }

    /**
     * @return HasMany<Subscription, $this>
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * @return HasMany<Rule, $this>
     */
    public function rules(): HasMany
    {
        return $this->hasMany(Rule::class)->orderBy('sort_order');
    }

    /**
     * @return HasMany<IndexEntry, $this>
     */
    public function indexEntries(): HasMany
    {
        return $this->hasMany(IndexEntry::class);
    }

    /**
     * @return HasMany<GameDatum, $this>
     */
    public function gameData(): HasMany
    {
        return $this->hasMany(GameDatum::class);
    }

    /**
     * @return HasMany<ModuleVersion, $this>
     */
    public function versions(): HasMany
    {
        return $this->hasMany(ModuleVersion::class);
    }

    /**
     * @return HasMany<ModuleDraftChange, $this>
     */
    public function draftChanges(): HasMany
    {
        return $this->hasMany(ModuleDraftChange::class);
    }

    public function isSubscriber(User $user): bool
    {
        return $this->subscriptions()->where('user_id', $user->id)->exists();
    }

    public function isEditor(User $user): bool
    {
        return $this->subscriptions()->where('user_id', $user->id)->where('editor', true)->exists();
    }
}
