<?php

namespace App\Service\Game;

/**
 * Server-side copy of Al Filo's deterministic simulation - a line-by-line port of
 * public/js/game/sim.js, so a run submitted by the browser (seed + inputs) can be replayed
 * here and its height checked instead of trusted.
 *
 * Keep it in lockstep with sim.js: same constants, same order of operations, same order of
 * random-number draws. tests/Service/Game/ClimbSimulationTest.php replays runs recorded by
 * the JS simulation and fails on any drift.
 */
final class ClimbSimulation
{
    public const SIM_VERSION = 1;

    public const TICK_RATE = 120;
    public const DT = 1 / self::TICK_RATE;

    public const WORLD_W = 400;
    public const VIEW_H = 520;

    public const PIXELS_PER_METER = 26;
    public const GRAVITY = 1500;
    public const MAX_CHARGE_TICKS = 78;
    public const MIN_JUMP_VY = 480;
    public const MAX_JUMP_VY = 980;
    public const MAX_JUMP_VX = 360;
    public const MIN_POWER_FLOOR = 0.22;
    public const JUMP_COST_BASE = 8;
    public const JUMP_COST_EXTRA = 14;

    public const STAMINA_REGEN_PER_SEC = 22;
    public const STAMINA_PRECISION_BONUS = 10;
    public const STAMINA_COMBO_BONUS = 2;
    public const STAMINA_PICKUP_BONUS = 18;
    public const MAX_CONCURRENT_PICKUPS = 2;

    public const PLAYER_RADIUS = 16;
    public const CAMERA_MARGIN_METERS = 11;
    public const CAMERA_TOP_FRACTION = 0.44;
    public const CAMERA_SMOOTH_SPEED = 10;
    public const FALL_MARGIN = self::CAMERA_MARGIN_METERS * self::PIXELS_PER_METER + self::VIEW_H * 0.5;

    public const COMBO_WINDOW_TICKS = 180;
    public const COMBO_MULTIPLIER_CAP = 5;
    public const BASE_LANDING_POINTS = 10;
    public const PRECISION_OFFCENTRE_RATIO = 0.22;
    public const SUMMIT_METERS = 1200;

    public const PICKUP_BOB_PERIOD = 316;
    public const MAX_TICKS = 45 * 60 * self::TICK_RATE;

    public const STATUS_PLAYING = 'playing';
    public const STATUS_DEAD = 'dead';
    public const STATUS_WON = 'won';

    public int $tick = 0;
    public string $status = self::STATUS_PLAYING;
    public float $peakY = 0.0;
    public float $camFocus = 0.0;
    public int $points = 0;

    /** @var array{x: float, y: float, vx: float, vy: float, onLedge: bool, stamina: float, facing: int} */
    public array $player;

    /** @var array{jumps: int, pickups: int, maxCombo: int, precise: int, rocksHit: int} */
    public array $stats = ['jumps' => 0, 'pickups' => 0, 'maxCombo' => 0, 'precise' => 0, 'rocksHit' => 0];

    /** @var list<array{id: int, x: float, y: float, width: float, isGround: bool, isSummit: bool}> */
    public array $ledges = [];

    /** @var list<array{x: float, y: float, vy: float, r: float, spin: float, rot: float}> */
    public array $rocks = [];

    /** @var list<array{x: float, y: float, phase: int}> */
    public array $pickups = [];

    private Mulberry32 $levelRng;
    private Mulberry32 $eventRng;
    private int $ledgeCounter = 0;
    private bool $charging = false;
    private int $chargeTick = 0;
    private int $lastRockTick = 4 * self::TICK_RATE;
    private int $nextPickupTick = 0;
    private int $comboChain = 0;
    private int $lastLandingTick = -1;
    private int $lastLandedLedgeId = 0;

    public function __construct(int $seed)
    {
        $seed &= 0xFFFFFFFF;
        $this->levelRng = new Mulberry32($seed);
        $this->eventRng = new Mulberry32(($seed ^ 0x9E3779B9) & 0xFFFFFFFF);

        $ground = $this->makeLedge(self::WORLD_W / 2, 0, self::WORLD_W + 40);
        $ground['isGround'] = true;
        $this->ledges[] = $ground;

        $this->player = [
            'x' => (float) $ground['x'],
            'y' => (float) ($ground['y'] - self::PLAYER_RADIUS),
            'vx' => 0.0,
            'vy' => 0.0,
            'onLedge' => true,
            'stamina' => 100.0,
            'facing' => 1,
        ];
        $this->peakY = $this->player['y'];
        $this->camFocus = $this->player['y'];
        $this->nextPickupTick = 3 * self::TICK_RATE + (int) floor($this->eventRng->range(5800, 8800) * self::TICK_RATE / 1000);

        $this->ensureLedgesAhead();
    }

    public static function dailySeed(string $day): int
    {
        return Mulberry32::hashString('al-filo:'.$day);
    }

    public static function metersFromY(float $y): int
    {
        return max(0, (int) floor(-$y / self::PIXELS_PER_METER));
    }

    public function heightMeters(): int
    {
        return self::metersFromY($this->peakY);
    }

    public static function chargePower(int $ticksHeld): float
    {
        return max(self::MIN_POWER_FLOOR, self::clamp($ticksHeld / self::MAX_CHARGE_TICKS, 0, 1));
    }

    /**
     * @return array{vx: float, vy: float, cost: float}
     */
    public static function calcJumpVelocities(float $power, float $aimDir, float $stamina): array
    {
        $cost = self::JUMP_COST_BASE + self::JUMP_COST_EXTRA * $power;
        $staminaRatio = self::clamp($stamina / $cost, 0, 1);
        $effPower = max(self::MIN_POWER_FLOOR * 0.55, $power * max($staminaRatio, 0.35));

        return [
            'vx' => $aimDir * self::MAX_JUMP_VX * (0.5 + 0.5 * $effPower),
            'vy' => -(self::MIN_JUMP_VY + (self::MAX_JUMP_VY - self::MIN_JUMP_VY) * $effPower),
            'cost' => min($cost, $stamina),
        ];
    }

    public static function pickupBob(int $tick, int $phase): float
    {
        $p = ($tick + $phase) % self::PICKUP_BOB_PERIOD;
        $half = self::PICKUP_BOB_PERIOD / 2;

        return $p < $half ? ($p / $half) * 2 - 1 : 1 - (($p - $half) / $half) * 2;
    }

    // ============================================
    // INPUT
    // ============================================
    public function beginCharge(): bool
    {
        if (self::STATUS_PLAYING !== $this->status || $this->charging || !$this->player['onLedge']) {
            return false;
        }
        $this->charging = true;
        $this->chargeTick = $this->tick;

        return true;
    }

    public function releaseCharge(int $aimMilli): bool
    {
        if (self::STATUS_PLAYING !== $this->status || !$this->charging) {
            return false;
        }
        $this->charging = false;
        if (!$this->player['onLedge']) {
            return true;
        }
        $aim = self::clamp($aimMilli, -1000, 1000) / 1000;
        $res = self::calcJumpVelocities(self::chargePower($this->tick - $this->chargeTick), $aim, $this->player['stamina']);
        $this->player['stamina'] = self::clamp($this->player['stamina'] - $res['cost'], 0, 100);
        $this->player['vy'] = $res['vy'];
        $this->player['vx'] = $res['vx'];
        $this->player['onLedge'] = false;
        if (abs($aim) > 0.1) {
            $this->player['facing'] = $aim > 0 ? 1 : -1;
        }
        ++$this->stats['jumps'];

        return true;
    }

    /**
     * @param array{0: string, 1: int, 2?: int} $input
     */
    public function applyInput(array $input): bool
    {
        return match ($input[0]) {
            'c' => $this->beginCharge(),
            'r' => $this->releaseCharge($input[2] ?? 0),
            default => false,
        };
    }

    // ============================================
    // STEP
    // ============================================
    public function step(): void
    {
        if (self::STATUS_PLAYING !== $this->status) {
            return;
        }

        if ($this->player['onLedge']) {
            if (!$this->charging && $this->player['stamina'] < 100) {
                $this->player['stamina'] = self::clamp($this->player['stamina'] + self::STAMINA_REGEN_PER_SEC * self::DT, 0, 100);
            }
        } else {
            $this->updateAirborne();
        }

        if (self::STATUS_PLAYING === $this->status) {
            $this->camFocus += ($this->player['y'] - $this->camFocus) * min(1, self::DT * self::CAMERA_SMOOTH_SPEED);
            $this->updateRocks();
            $this->updatePickups();
            $this->ensureLedgesAhead();
            if ($this->player['y'] > $this->fallLimitY()) {
                $this->status = self::STATUS_DEAD;
            }
        }
        ++$this->tick;
    }

    /**
     * Run a recorded list of inputs from a fresh seed until the run ends. Returns null when
     * the inputs can't have come from a real run (out of order, rejected by the simulation,
     * left over after the run ended, or the run never ended).
     *
     * @param list<array{0: string, 1: int, 2?: int}> $inputs
     */
    public static function replay(int $seed, array $inputs, int $endTick): ?self
    {
        $sim = new self($seed);
        $next = 0;
        $count = \count($inputs);
        $limit = min($endTick, self::MAX_TICKS);
        while (self::STATUS_PLAYING === $sim->status && $sim->tick <= $limit) {
            while ($next < $count && $inputs[$next][1] === $sim->tick) {
                if (!$sim->applyInput($inputs[$next])) {
                    return null;
                }
                ++$next;
            }
            if ($next < $count && $inputs[$next][1] < $sim->tick) {
                return null;
            }
            $sim->step();
        }

        return ($next === $count && self::STATUS_PLAYING !== $sim->status) ? $sim : null;
    }

    // ============================================
    // WORLD
    // ============================================
    /**
     * @return array{id: int, x: float, y: float, width: float, isGround: bool, isSummit: bool}
     */
    private function makeLedge(float $x, float $y, float $width): array
    {
        ++$this->ledgeCounter;

        return ['id' => $this->ledgeCounter, 'x' => $x, 'y' => $y, 'width' => $width, 'isGround' => false, 'isSummit' => false];
    }

    private function pushNextLedge(): void
    {
        $prev = $this->ledges[\count($this->ledges) - 1];
        if ($prev['isSummit']) {
            return;
        }
        $rng = $this->levelRng;
        $metersHere = self::metersFromY($prev['y']);

        if ($metersHere >= self::SUMMIT_METERS) {
            $summit = $this->makeLedge(self::WORLD_W / 2, $prev['y'] - $rng->range(70, 100), 90);
            $summit['isSummit'] = true;
            $this->ledges[] = $summit;

            return;
        }

        $progress = self::clamp($metersHere / 260, 0, 1);

        $gap = $rng->range(70, 105) + $progress * $rng->range(20, 95);
        $width = self::clamp($rng->range(70, 110) - $progress * 35, 42, 110);
        $maxOffset = 60 + $progress * 170;

        $summitPull = self::clamp(($metersHere - (self::SUMMIT_METERS - 220)) / 220, 0, 1);
        $width = self::lerp($width, 85, $summitPull * 0.4);
        $maxOffset = self::lerp($maxOffset, 50, $summitPull);

        $minX = $width / 2 + 10;
        $maxX = self::WORLD_W - $width / 2 - 10;
        $centre = self::WORLD_W / 2;

        $x = $prev['x'] + $rng->range(-$maxOffset, $maxOffset);
        $x = self::lerp($x, $centre, $summitPull * 0.5);
        $x = self::clamp($x, $minX, $maxX);

        $ledge = $this->makeLedge($x, $prev['y'] - $gap, $width);
        // Bolt placement only matters for drawing, but the draws keep the sequence in sync.
        $rng->next();
        $rng->next();
        $this->ledges[] = $ledge;
    }

    private function viewTop(): float
    {
        return $this->camFocus - self::VIEW_H * self::CAMERA_TOP_FRACTION;
    }

    private function viewBottom(): float
    {
        return $this->camFocus + self::VIEW_H * (1 - self::CAMERA_TOP_FRACTION);
    }

    private function fallLimitY(): float
    {
        return $this->peakY + self::FALL_MARGIN;
    }

    private function ensureLedgesAhead(): void
    {
        $limit = $this->viewTop() - 400;
        $guard = 0;
        while ($guard < 200) {
            $top = $this->ledges[\count($this->ledges) - 1];
            if ($top['isSummit'] || $top['y'] <= $limit) {
                break;
            }
            $this->pushNextLedge();
            ++$guard;
        }
        $pruneBelow = $this->fallLimitY() + 400;
        while (\count($this->ledges) > 1 && $this->ledges[0]['y'] > $pruneBelow) {
            array_shift($this->ledges);
        }
    }

    private function registerComboLanding(int $ledgeId): void
    {
        $isRepeat = $ledgeId === $this->lastLandedLedgeId;
        $this->lastLandedLedgeId = $ledgeId;
        if (!$isRepeat && $this->lastLandingTick >= 0 && $this->tick - $this->lastLandingTick < self::COMBO_WINDOW_TICKS) {
            ++$this->comboChain;
        } else {
            $this->comboChain = 1;
        }
        $this->lastLandingTick = $this->tick;
        $this->stats['maxCombo'] = max($this->stats['maxCombo'], $this->comboChain);

        $multiplier = min($this->comboChain, self::COMBO_MULTIPLIER_CAP);
        $this->points += self::BASE_LANDING_POINTS * $multiplier;
        if ($this->comboChain < 2) {
            return;
        }
        $this->player['stamina'] = self::clamp($this->player['stamina'] + self::STAMINA_COMBO_BONUS * min($this->comboChain - 1, 4), 0, 100);
    }

    /**
     * @param array{id: int, x: float, y: float, width: float, isGround: bool, isSummit: bool} $ledge
     */
    private function registerPrecisionLanding(array $ledge): void
    {
        $offCentre = abs($this->player['x'] - $ledge['x']) / ($ledge['width'] / 2);
        if ($offCentre >= self::PRECISION_OFFCENTRE_RATIO || $ledge['width'] >= 95) {
            return;
        }
        $this->player['stamina'] = self::clamp($this->player['stamina'] + self::STAMINA_PRECISION_BONUS, 0, 100);
        ++$this->stats['precise'];
    }

    /**
     * @param array{id: int, x: float, y: float, width: float, isGround: bool, isSummit: bool} $ledge
     */
    private function landOn(array $ledge): void
    {
        $this->player['y'] = $ledge['y'] - self::PLAYER_RADIUS;
        $this->player['vy'] = 0.0;
        $this->player['vx'] = 0.0;
        $this->player['onLedge'] = true;
        if ($ledge['isSummit']) {
            $this->status = self::STATUS_WON;

            return;
        }
        $this->registerComboLanding($ledge['id']);
        $this->registerPrecisionLanding($ledge);
    }

    private function checkLedgeLanding(float $prevBottom): void
    {
        if ($this->player['vy'] <= 0) {
            return;
        }
        $newBottom = $this->player['y'] + self::PLAYER_RADIUS;
        foreach ($this->ledges as $ledge) {
            $withinX = abs($this->player['x'] - $ledge['x']) <= $ledge['width'] / 2;
            $crossing = $prevBottom <= $ledge['y'] && $newBottom >= $ledge['y'];
            if ($withinX && $crossing) {
                $this->landOn($ledge);

                return;
            }
        }
    }

    private function handleWallBounce(): void
    {
        $minX = self::PLAYER_RADIUS + 2;
        $maxX = self::WORLD_W - self::PLAYER_RADIUS - 2;
        if ($this->player['x'] >= $minX && $this->player['x'] <= $maxX) {
            return;
        }
        $this->player['x'] = self::clamp($this->player['x'], $minX, $maxX);
        $this->player['vx'] = -$this->player['vx'] * 0.55;
    }

    private function updateAirborne(): void
    {
        $prevBottom = $this->player['y'] + self::PLAYER_RADIUS;
        $this->player['vy'] += self::GRAVITY * self::DT;
        $this->player['x'] += $this->player['vx'] * self::DT;
        $this->player['y'] += $this->player['vy'] * self::DT;
        $this->handleWallBounce();
        $this->checkLedgeLanding($prevBottom);
        $this->peakY = min($this->peakY, $this->player['y']);
    }

    private function maybeSpawnRock(): void
    {
        $meters = self::metersFromY($this->player['y']);
        $progress = self::clamp($meters / 180, 0, 1);
        $interval = (5200 - $progress * 3200) * self::TICK_RATE / 1000;
        if ($this->tick - $this->lastRockTick < $interval || $meters < 25) {
            return;
        }
        $rng = $this->eventRng;
        $this->lastRockTick = $this->tick;
        $this->rocks[] = [
            'x' => $rng->range(20, self::WORLD_W - 20),
            'y' => $this->viewTop() - 60,
            'vy' => $rng->range(140, 220),
            'r' => $rng->range(8, 14),
            'spin' => $rng->range(-3, 3),
            'rot' => $rng->range(0, 6.283185307179586),
        ];
    }

    private function updateRocks(): void
    {
        $this->maybeSpawnRock();
        $bottom = $this->viewBottom();
        for ($i = \count($this->rocks) - 1; $i >= 0; --$i) {
            $rock = &$this->rocks[$i];
            $rock['y'] += $rock['vy'] * self::DT;
            $rock['rot'] += $rock['spin'] * self::DT;
            $y = $rock['y'];
            $x = $rock['x'];
            $r = $rock['r'];
            unset($rock);
            if ($y > $bottom + 200) {
                array_splice($this->rocks, $i, 1);
                continue;
            }
            $dx = $x - $this->player['x'];
            $dy = $y - $this->player['y'];
            if (sqrt($dx * $dx + $dy * $dy) < $r + self::PLAYER_RADIUS - 4) {
                array_splice($this->rocks, $i, 1);
                $this->player['onLedge'] = false;
                $this->player['vy'] = min($this->player['vy'], 0) + 180;
                $this->player['vx'] += $dx > 0 ? -140 : 140;
                ++$this->stats['rocksHit'];
            }
        }
    }

    private function maybeSpawnPickup(): void
    {
        if ($this->tick < $this->nextPickupTick || self::metersFromY($this->player['y']) < 12 || \count($this->pickups) >= self::MAX_CONCURRENT_PICKUPS) {
            return;
        }
        $top = $this->viewTop();
        $bandLow = $top + 50;
        $bandHigh = $top - 280;
        $candidates = [];
        $ledgeCount = \count($this->ledges);
        for ($i = 0; $i < $ledgeCount - 1; ++$i) {
            $a = $this->ledges[$i];
            $b = $this->ledges[$i + 1];
            if ($a['isSummit'] || $b['isSummit']) {
                continue;
            }
            $mid = ($a['y'] + $b['y']) / 2;
            if ($mid <= $bandLow && $mid >= $bandHigh) {
                $candidates[] = $i;
            }
        }
        if ([] === $candidates) {
            return;
        }
        $rng = $this->eventRng;
        $this->nextPickupTick = $this->tick + (int) floor($rng->range(5800, 8800) * self::TICK_RATE / 1000);
        $idx = $candidates[(int) floor($rng->range(0, \count($candidates)))];
        $a2 = $this->ledges[$idx];
        $b2 = $this->ledges[$idx + 1];
        $t = $rng->range(0.35, 0.65);
        $this->pickups[] = [
            'x' => self::clamp(self::lerp($a2['x'], $b2['x'], $t) + $rng->range(-14, 14), 24, self::WORLD_W - 24),
            'y' => self::lerp($a2['y'], $b2['y'], $t) - $rng->range(10, 30),
            'phase' => (int) floor($rng->range(0, self::PICKUP_BOB_PERIOD)),
        ];
    }

    private function updatePickups(): void
    {
        $this->maybeSpawnPickup();
        $bottom = $this->viewBottom();
        for ($i = \count($this->pickups) - 1; $i >= 0; --$i) {
            $pk = $this->pickups[$i];
            if ($pk['y'] > $bottom + 200) {
                array_splice($this->pickups, $i, 1);
                continue;
            }
            $dx = $pk['x'] - $this->player['x'];
            $dy = ($pk['y'] + self::pickupBob($this->tick, $pk['phase']) * 6) - $this->player['y'];
            if (sqrt($dx * $dx + $dy * $dy) < 20) {
                array_splice($this->pickups, $i, 1);
                $this->player['stamina'] = self::clamp($this->player['stamina'] + self::STAMINA_PICKUP_BONUS, 0, 100);
                ++$this->stats['pickups'];
            }
        }
    }

    private static function clamp(float $v, float $min, float $max): float
    {
        return max($min, min($max, $v));
    }

    private static function lerp(float $a, float $b, float $f): float
    {
        return $a + ($b - $a) * $f;
    }
}
