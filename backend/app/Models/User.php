<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Module;
use Carbon\CarbonInterface;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property-read string $id
 * @property-read string $name
 * @property-read string $email
 * @property-read CarbonInterface|null $email_verified_at
 * @property-read string $password
 * @property-read string|null $remember_token
 * @property-read CarbonInterface $created_at
 * @property-read CarbonInterface $updated_at
 */
final class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUlids, Notifiable;

    public static function boot(): void
    {
        parent::boot();

        self::created(function (User $user): void {
            $user->assignRole('admin', null);
        });
    }

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * @return array<string, string>
     */
    public function casts(): array
    {
        return [
            'id' => 'string',
            'name' => 'string',
            'email' => 'string',
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'remember_token' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /** @return HasMany<System> */
    public function systems(): HasMany
    {
        return $this->hasMany(System::class, 'owner_id');
    }

    /** @return BelongsToMany<Role> */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    public function assignRole(string $roleName, System|null $system): void
    {
        $query = Role::query()->where('name', $roleName);

        if ($system) {
            $query->where('system_id', $system->id);
        } else {
            $query->whereNull('system_id');
        }

        $role = $query->firstOrFail();

        $this->roles()->attach($role->id, ['system_id' => $system->id ?? null]);
    }

    public function hasPermissionTo(string $permission, System|Module|null $context = null): bool
    {
        $query = DB::table('role_user')->where('user_id', $this->id);

        if ($context === null) {
            $query->whereNull('role_user.system_id')->whereNull('role_user.module_id');
        }

        if ($context instanceof System) {
            $query->where('role_user.system_id', $context->id)->whereNull('role_user.module_id');
        }

        if ($context instanceof Module) {
            $query->where('role_user.system_id', $context->system_id)->where('role_user.module_id', $context->id);
        }

        $permissions = $query
            ->join('roles', 'role_user.role_id', '=', 'roles.id')
            ->join('permission_role', 'roles.id', '=', 'permission_role.role_id')
            ->join('permissions', 'permission_role.permission_id', '=', 'permissions.id')
            ->select('permissions.name as name')
            ->pluck('name');

        if ($permissions->contains($permission)) {
            return true;
        }

        return false;
    }
}
