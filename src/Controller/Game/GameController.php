<?php

namespace App\Controller\Game;

use App\Entity\GameDailyScore;
use App\Entity\GameProfile;
use App\Entity\GameScore;
use App\Entity\User;
use App\Repository\GameDailyScoreRepository;
use App\Repository\GameProfileRepository;
use App\Repository\GameScoreRepository;
use App\Service\Game\ClimbSimulation;
use App\Service\Game\GameAchievements;
use App\Service\Game\GameRunValidator;
use App\Service\Game\InvalidGameRunException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class GameController extends AbstractController
{
    #[Route('/juego', name: 'app_game', methods: ['GET'])]
    public function index(
        GameScoreRepository $gameScoreRepository,
        GameDailyScoreRepository $dailyScoreRepository,
        GameProfileRepository $profileRepository,
    ): Response {
        $user = $this->getUser();
        $today = new \DateTimeImmutable('today');
        $myScore = null;
        $myRank = null;
        $myDailyRank = null;
        $profile = null;

        if ($user instanceof User) {
            $myScore = $gameScoreRepository->findOneBy(['user' => $user]);
            if (null !== $myScore) {
                $myRank = $gameScoreRepository->findRank($user);
            }
            $myDailyRank = $dailyScoreRepository->findRankForDay($user, $today);
            $profile = $profileRepository->findOneBy(['user' => $user]);
        }

        return $this->render('game/index.html.twig', [
            'topScores' => $gameScoreRepository->findTop(10),
            'topDaily' => $dailyScoreRepository->findTopForDay($today, 10),
            'myScore' => $myScore,
            'myRank' => $myRank,
            'myDailyRank' => $myDailyRank,
            'dailyDay' => $today->format('Y-m-d'),
            'achievements' => $profile?->getAchievements() ?? [],
            'skin' => $profile?->getSkin() ?? GameAchievements::DEFAULT_SKIN,
        ]);
    }

    /**
     * A finished run: seed + recorded inputs. The server replays it with its own copy of the
     * simulation (ClimbSimulation) and only ever stores the height that replay reaches, so
     * the leaderboard can't be filled with made-up numbers from the browser console.
     */
    #[Route('/api/juego/partida', name: 'api_game_score', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function submitRun(
        Request $request,
        EntityManagerInterface $entityManager,
        GameRunValidator $validator,
        GameScoreRepository $gameScoreRepository,
        GameDailyScoreRepository $dailyScoreRepository,
        GameProfileRepository $profileRepository,
    ): JsonResponse {
        if (!$this->isCsrfTokenValid('game_score', $request->headers->get('X-CSRF-TOKEN'))) {
            return new JsonResponse(['success' => false, 'message' => 'Token CSRF inválido'], 403);
        }

        $user = $this->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        $data = json_decode($request->getContent(), true);
        if (!\is_array($data)) {
            return new JsonResponse(['success' => false, 'message' => 'Partida no válida.'], 400);
        }

        try {
            $run = $validator->validate($data, new \DateTimeImmutable('today'));
        } catch (InvalidGameRunException $e) {
            return new JsonResponse(['success' => false, 'message' => $e->getMessage()], $e->getStatusCode());
        }

        $now = new \DateTimeImmutable();
        $height = $run->heightMeters();

        // All-time best - daily runs are real runs too, so they count here as well.
        $score = $gameScoreRepository->findOneBy(['user' => $user]);
        $isNewRecord = null === $score || $height > $score->getHeightMeters();
        if ($isNewRecord) {
            $score ??= (new GameScore())->setUser($user);
            $score->setHeightMeters($height)->setAchievedAt($now);
            $entityManager->persist($score);
        }

        $dailyResult = null;
        $isNewDaily = false;
        $dailyDay = $run->day;
        if (null !== $dailyDay) {
            $daily = $dailyScoreRepository->findOneBy(['user' => $user, 'day' => $dailyDay]);
            $isNewDaily = null === $daily || $height > $daily->getHeightMeters();
            if ($isNewDaily) {
                $daily ??= (new GameDailyScore())->setUser($user)->setDay($dailyDay);
                $daily->setHeightMeters($height)->setAchievedAt($now);
                $entityManager->persist($daily);
            }
        }

        $profile = $profileRepository->findOneBy(['user' => $user]) ?? (new GameProfile())->setUser($user);
        $newAchievements = $profile->unlock(GameAchievements::forRun($run->sim, $run->isDaily()));
        $profile->addRun();
        $entityManager->persist($profile);

        $entityManager->flush();

        if (null !== $dailyDay) {
            $dailyResult = [
                'isNewRecord' => $isNewDaily,
                'rank' => $dailyScoreRepository->findRankForDay($user, $dailyDay),
                'top' => array_map([self::class, 'describeDailyScore'], $dailyScoreRepository->findTopForDay($dailyDay, 10)),
            ];
        }

        return new JsonResponse([
            'success' => true,
            'height' => $height,
            'won' => ClimbSimulation::STATUS_WON === $run->sim->status,
            'isNewRecord' => $isNewRecord,
            'rank' => $gameScoreRepository->findRank($user),
            'top' => array_map([self::class, 'describeScore'], $gameScoreRepository->findTop(10)),
            'daily' => $dailyResult,
            'newAchievements' => $newAchievements,
            'achievements' => $profile->getAchievements(),
        ]);
    }

    #[Route('/api/juego/aspecto', name: 'api_game_skin', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function chooseSkin(
        Request $request,
        EntityManagerInterface $entityManager,
        GameProfileRepository $profileRepository,
    ): JsonResponse {
        if (!$this->isCsrfTokenValid('game_score', $request->headers->get('X-CSRF-TOKEN'))) {
            return new JsonResponse(['success' => false, 'message' => 'Token CSRF inválido'], 403);
        }

        $user = $this->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        $data = json_decode($request->getContent(), true);
        $skin = \is_array($data) ? ($data['skin'] ?? null) : null;
        $profile = $profileRepository->findOneBy(['user' => $user]) ?? (new GameProfile())->setUser($user);

        if (!\is_string($skin) || !GameAchievements::isSkinUnlocked($skin, $profile->getAchievements())) {
            return new JsonResponse(['success' => false, 'message' => 'Ese aspecto todavía está bloqueado.'], 400);
        }

        $profile->setSkin($skin);
        $entityManager->persist($profile);
        $entityManager->flush();

        return new JsonResponse(['success' => true, 'skin' => $skin]);
    }

    /**
     * @return array{userId: int|null, name: string|null, height: int}
     */
    private static function describeScore(GameScore $score): array
    {
        $user = $score->getUser();

        return [
            'userId' => $user instanceof User ? $user->getId() : null,
            'name' => $user instanceof User ? $user->getName() : null,
            'height' => $score->getHeightMeters(),
        ];
    }

    /**
     * @return array{userId: int|null, name: string|null, height: int}
     */
    private static function describeDailyScore(GameDailyScore $score): array
    {
        $user = $score->getUser();

        return [
            'userId' => $user instanceof User ? $user->getId() : null,
            'name' => $user instanceof User ? $user->getName() : null,
            'height' => $score->getHeightMeters(),
        ];
    }
}
