<?php

namespace App\Service\Game;

/**
 * Turns a run submitted by the browser into a trusted result: checks the payload's shape,
 * that a daily run really used that day's seed, then replays the inputs with the server's
 * own copy of the simulation and only accepts the height the replay reaches.
 */
final class GameRunValidator
{
    private const MAX_INPUTS = 20000;

    /**
     * @param array<mixed, mixed> $data
     *
     * @throws InvalidGameRunException
     */
    public function validate(array $data, \DateTimeImmutable $today): ValidatedGameRun
    {
        if (($data['version'] ?? null) !== ClimbSimulation::SIM_VERSION) {
            throw new InvalidGameRunException('El juego se ha actualizado. Recarga la página para guardar tus partidas.', 409);
        }

        $mode = $data['mode'] ?? null;
        $seed = $data['seed'] ?? null;
        $endTick = $data['endTick'] ?? null;
        $height = $data['height'] ?? null;
        $inputs = $data['inputs'] ?? null;

        if (!\in_array($mode, ['free', 'daily'], true)
            || !\is_int($seed) || $seed < 0 || $seed > 0xFFFFFFFF
            || !\is_int($endTick) || $endTick < 1 || $endTick > ClimbSimulation::MAX_TICKS + 1
            || !\is_int($height) || $height < 0
            || !\is_array($inputs) || !array_is_list($inputs) || \count($inputs) > self::MAX_INPUTS) {
            throw new InvalidGameRunException('Partida no válida.');
        }

        $cleanInputs = [];
        foreach ($inputs as $input) {
            if (!\is_array($input) || !isset($input[0], $input[1]) || !\is_int($input[1]) || $input[1] < 0) {
                throw new InvalidGameRunException('Partida no válida.');
            }
            if ('c' === $input[0]) {
                $cleanInputs[] = ['c', $input[1]];
            } elseif ('r' === $input[0] && isset($input[2]) && \is_int($input[2]) && abs($input[2]) <= 1000) {
                $cleanInputs[] = ['r', $input[1], $input[2]];
            } else {
                throw new InvalidGameRunException('Partida no válida.');
            }
        }

        $day = null;
        if ('daily' === $mode) {
            $day = $this->resolveDailyDay($data['day'] ?? null, $today);
            if ($seed !== ClimbSimulation::dailySeed($day->format('Y-m-d'))) {
                throw new InvalidGameRunException('Ese no es el reto de hoy.');
            }
        }

        $sim = ClimbSimulation::replay($seed, $cleanInputs, $endTick);
        if (null === $sim || $sim->heightMeters() !== $height) {
            throw new InvalidGameRunException('No hemos podido verificar esta partida.', 422);
        }

        return new ValidatedGameRun($sim, $day);
    }

    /**
     * A daily run can be submitted for today, or for yesterday if it started just before
     * midnight.
     */
    private function resolveDailyDay(mixed $day, \DateTimeImmutable $today): \DateTimeImmutable
    {
        $todayStr = $today->format('Y-m-d');
        $yesterdayStr = $today->modify('-1 day')->format('Y-m-d');
        if (!\is_string($day) || !\in_array($day, [$todayStr, $yesterdayStr], true)) {
            throw new InvalidGameRunException('Ese reto diario ya ha terminado.');
        }

        return new \DateTimeImmutable($day);
    }
}
