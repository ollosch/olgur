<?php

declare(strict_types=1);

namespace App\Models;

use App\Data\ModuleConfig;
use App\Enums\GameDataType;
use Database\Factories\ModuleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * @property string $id
 * @property string $system_id
 * @property string $slug
 * @property string $name
 * @property string $description
 * @property ModuleConfig $config
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
            'config' => ModuleConfig::class,
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
     * The module's sequence-of-play row, if it defines one.
     *
     * A module has at most one SOP (enforced by game-data validation).
     */
    public function sop(): ?GameDatum
    {
        return $this->gameData()
            ->where('type', GameDataType::Sop->value)
            ->first();
    }

    /**
     * The module's tables, keyed by slug.
     *
     * @return Collection<int|string, GameDatum>
     */
    public function tables(): Collection
    {
        return $this->gameData()
            ->where('type', GameDataType::Table->value)
            ->get()
            ->keyBy('slug');
    }

    /**
     * Resolve a game datum by slug and type, preferring the current module and
     * falling back to the system's core module. The current module wins on a
     * slug collision.
     */
    public function resolveGameDatum(GameDataType $type, string $slug): ?GameDatum
    {
        $datum = $this->gameData()
            ->where('type', $type->value)
            ->where('slug', $slug)
            ->first();

        if ($datum !== null || $this->is_core) {
            return $datum;
        }

        $core = $this->system?->coreModule();

        if ($core === null) {
            return null;
        }

        return $core->gameData()
            ->where('type', $type->value)
            ->where('slug', $slug)
            ->first();
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
