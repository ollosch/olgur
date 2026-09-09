<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Stable tool keys a module may declare.
 *
 * These keys map to deployed frontend implementations; they are never Vue
 * component names or user-authored code.
 */
enum ModuleTool: string
{
    case UnitBrowser = 'unit_browser';
    case OrdnanceVersusArmor = 'ordnance_versus_armor';
}
