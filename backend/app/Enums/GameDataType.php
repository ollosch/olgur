<?php

declare(strict_types=1);

namespace App\Enums;

enum GameDataType: string
{
    case Sop = 'sop';
    case Table = 'table';
    case Ordnance = 'ordnance';
    case Vehicle = 'vehicle';
}
