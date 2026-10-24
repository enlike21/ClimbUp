<?php

namespace App\Service\Game;

/**
 * mulberry32, the seeded generator behind Al Filo's levels and events - a bit-exact port of
 * createRng() in public/js/game/sim.js. Values are kept as unsigned 32-bit ints throughout;
 * JS works with the same bits as signed int32, which gives identical results mod 2^32.
 */
final class Mulberry32
{
    private const MASK = 0xFFFFFFFF;

    private int $state;

    public function __construct(int $seed)
    {
        $this->state = $seed & self::MASK;
    }

    public function next(): float
    {
        $this->state = ($this->state + 0x6D2B79F5) & self::MASK;
        $t = $this->state;
        $t = self::imul($t ^ ($t >> 15), $t | 1);
        $t ^= ($t + self::imul($t ^ ($t >> 7), $t | 61)) & self::MASK;

        return (($t ^ ($t >> 14)) & self::MASK) / 4294967296;
    }

    public function range(float $min, float $max): float
    {
        return $min + $this->next() * ($max - $min);
    }

    /**
     * Math.imul: the low 32 bits of a 32x32-bit multiply. Split into 16-bit halves so the
     * intermediate products never overflow PHP's signed 64-bit int.
     */
    public static function imul(int $a, int $b): int
    {
        $a &= self::MASK;
        $b &= self::MASK;
        $aHigh = ($a >> 16) & 0xFFFF;
        $aLow = $a & 0xFFFF;

        return (($aLow * $b) + ((($aHigh * $b) & 0xFFFF) << 16)) & self::MASK;
    }

    /**
     * FNV-1a over a string, as hashString() in sim.js.
     */
    public static function hashString(string $value): int
    {
        $hash = 0x811C9DC5;
        $length = \strlen($value);
        for ($i = 0; $i < $length; ++$i) {
            $hash = ($hash ^ \ord($value[$i])) & self::MASK;
            $hash = self::imul($hash, 0x01000193);
        }

        return $hash;
    }
}
