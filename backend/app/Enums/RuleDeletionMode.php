<?php

declare(strict_types=1);

namespace App\Enums;

enum RuleDeletionMode: string
{
    case ReParent = 're_parent';
    case Recursive = 'recursive';
}
