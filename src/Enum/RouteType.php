<?php

namespace App\Enum;

enum RouteType: string
{
    case BOULDER = 'Boulder';
    case SPORT = 'Sport';
    case TRAD = 'Trad';
    case TOPROPE = 'Toprope';
    case AID = 'Aid';
    case ALPINE = 'Alpine';

    public function icon(): string
    {
        return match ($this) {
            self::BOULDER => 'fa-hand-rock',
            self::SPORT => 'fa-bolt',
            self::TRAD => 'fa-link',
            self::TOPROPE => 'fa-arrow-up',
            self::AID => 'fa-hammer',
            self::ALPINE => 'fa-mountain',
        };
    }
}
