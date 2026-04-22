<?php

declare(strict_types=1);

namespace App\Enums;

enum SystemStructure: string
{
    case CorePlusOne = 'core_plus_one';
    case CorePlusMany = 'core_plus_many';
    case GroupingOnly = 'grouping_only';
}
