<?php

namespace App\Service\Game;

/**
 * Al Filo's achievements and the climber skins they unlock - mirrors ACHIEVEMENTS / SKINS /
 * achievementsForRun() in public/js/game/sim.js. Awarded from the server's own replay of a
 * run, never from anything the browser claims.
 */
final class GameAchievements
{
    /**
     * @var list<array{id: string, minM?: int, won?: bool, maxCombo?: int, precise?: int, pickups?: int, noPickups?: bool, daily?: bool}>
     */
    private const ACHIEVEMENTS = [
        ['id' => 'primeros-pasos', 'minM' => 50],
        ['id' => 'mont-blanc', 'minM' => 150],
        ['id' => 'cervino', 'minM' => 320],
        ['id' => 'aconcagua', 'minM' => 500],
        ['id' => 'denali', 'minM' => 700],
        ['id' => 'k2', 'minM' => 900],
        ['id' => 'everest', 'minM' => 1100],
        ['id' => 'cumbre', 'won' => true],
        ['id' => 'combo-7', 'maxCombo' => 7],
        ['id' => 'preciso-10', 'precise' => 10],
        ['id' => 'clips-5', 'pickups' => 5],
        ['id' => 'purista', 'won' => true, 'noPickups' => true],
        ['id' => 'diario', 'daily' => true],
    ];

    /**
     * Skin id => achievement that unlocks it (null = always available).
     */
    public const SKINS = [
        'clasico' => null,
        'glaciar' => 'denali',
        'turbo' => 'combo-7',
        'diario' => 'diario',
        'nocturno' => 'everest',
        'cumbre' => 'cumbre',
    ];

    public const DEFAULT_SKIN = 'clasico';

    /**
     * @return list<string>
     */
    public static function forRun(ClimbSimulation $sim, bool $daily): array
    {
        $height = $sim->heightMeters();
        $won = ClimbSimulation::STATUS_WON === $sim->status;
        $stats = $sim->stats;

        $unlocked = [];
        foreach (self::ACHIEVEMENTS as $a) {
            $ok = true;
            if (isset($a['minM']) && $height < $a['minM']) {
                $ok = false;
            }
            if (($a['won'] ?? false) && !$won) {
                $ok = false;
            }
            if (isset($a['maxCombo']) && $stats['maxCombo'] < $a['maxCombo']) {
                $ok = false;
            }
            if (isset($a['precise']) && $stats['precise'] < $a['precise']) {
                $ok = false;
            }
            if (isset($a['pickups']) && $stats['pickups'] < $a['pickups']) {
                $ok = false;
            }
            if (($a['noPickups'] ?? false) && $stats['pickups'] > 0) {
                $ok = false;
            }
            if (($a['daily'] ?? false) && !$daily) {
                $ok = false;
            }
            if ($ok) {
                $unlocked[] = $a['id'];
            }
        }

        return $unlocked;
    }

    /**
     * @param list<string> $achievements
     */
    public static function isSkinUnlocked(string $skin, array $achievements): bool
    {
        if (!\array_key_exists($skin, self::SKINS)) {
            return false;
        }
        $needs = self::SKINS[$skin];

        return null === $needs || \in_array($needs, $achievements, true);
    }
}
