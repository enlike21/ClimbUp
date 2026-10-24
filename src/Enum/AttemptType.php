<?php

namespace App\Enum;

enum AttemptType: string
{
    case ONSIGHT = 'onsight';
    case FLASH = 'flash';
    case REDPOINT = 'redpoint';
    case TOPROPE = 'toprope';

    public function label(): string
    {
        return match ($this) {
            self::ONSIGHT => 'A vista',
            self::FLASH => 'Flash',
            self::REDPOINT => 'Encadenado (redpoint)',
            self::TOPROPE => 'Top-rope',
        };
    }

    public function icon(): string
    {
        return match ($this) {
            self::ONSIGHT => 'fa-eye',
            self::FLASH => 'fa-bolt',
            self::REDPOINT => 'fa-check-double',
            self::TOPROPE => 'fa-arrow-up',
        };
    }
}
