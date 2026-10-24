<?php

namespace App\Controller\User;

use App\Entity\ClimbingRoute;
use App\Entity\CompletedRoute;
use App\Entity\UserRoute;
use App\Enum\AttemptType;
use App\Service\StatisticsService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/mis-rutas')]
#[IsGranted('ROLE_USER')]
class SavedRoutesController extends AbstractController
{
    #[Route('/', name: 'app_saved_routes', methods: ['GET'])]
    public function index(EntityManagerInterface $entityManager, StatisticsService $statisticsService): Response
    {
        $user = $this->getUser();

        $savedRoutes = $entityManager->getRepository(UserRoute::class)->findBy(['user' => $user]);
        $completedRoutes = $entityManager->getRepository(CompletedRoute::class)->findBy(['user' => $user]);
        $userStats = $statisticsService->getUserStats($user);

        return $this->render('saved_routes/saved_routes.html.twig', [
            'savedRoutes' => $savedRoutes,
            'completedRoutes' => $completedRoutes,
            'userStats' => $userStats,
        ]);
    }

    #[Route('/guardar', name: 'app_save_route', methods: ['POST'])]
    public function save(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        if (!$this->isCsrfTokenValid('saved_routes', $request->headers->get('X-CSRF-TOKEN'))) {
            return new JsonResponse(['success' => false, 'message' => 'Token CSRF inválido'], 403);
        }

        $user = $this->getUser();
        $data = json_decode($request->getContent(), true);

        if (!isset($data['id'])) {
            return new JsonResponse(['success' => false, 'message' => 'ID de ruta no proporcionado'], 400);
        }

        $route = $entityManager->getRepository(ClimbingRoute::class)->find($data['id']);

        if (!$route) {
            return new JsonResponse(['success' => false, 'message' => 'Ruta no encontrada'], 404);
        }

        $existingEntry = $entityManager->getRepository(UserRoute::class)->findOneBy([
            'user' => $user,
            'route' => $route,
        ]);

        if (!$existingEntry) {
            $userRoute = new UserRoute();
            $userRoute->setUser($user);
            $userRoute->setRoute($route);

            $entityManager->persist($userRoute);
            $entityManager->flush();

            return new JsonResponse(['success' => true, 'message' => 'Ruta guardada en Mis Rutas']);
        }

        return new JsonResponse(['success' => false, 'message' => 'Esta ruta ya está guardada']);
    }

    #[Route('/check-saved', name: 'app_check_saved_route', methods: ['POST'])]
    public function checkSavedRoute(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        if (!$this->isCsrfTokenValid('saved_routes', $request->headers->get('X-CSRF-TOKEN'))) {
            return new JsonResponse(['saved' => false, 'message' => 'Token CSRF inválido'], 403);
        }

        $user = $this->getUser();
        $data = json_decode($request->getContent(), true);

        if (!isset($data['id'])) {
            return new JsonResponse(['saved' => false, 'message' => 'ID de ruta no proporcionado'], 400);
        }

        $route = $entityManager->getRepository(ClimbingRoute::class)->find($data['id']);

        if (!$route) {
            return new JsonResponse(['saved' => false, 'message' => 'Ruta no encontrada'], 404);
        }

        $existingEntry = $entityManager->getRepository(UserRoute::class)->findOneBy([
            'user' => $user,
            'route' => $route,
        ]);

        return new JsonResponse(['saved' => null !== $existingEntry]);
    }

    #[Route('/eliminar/{id}', name: 'app_delete_saved_route', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function deleteSavedRoute(int $id, Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        if (!$this->isCsrfTokenValid('saved_routes', $request->headers->get('X-CSRF-TOKEN'))) {
            return new JsonResponse(['success' => false, 'message' => 'Token CSRF inválido'], 403);
        }

        $user = $this->getUser();
        $savedRoute = $entityManager->getRepository(UserRoute::class)->findOneBy([
            'user' => $user,
            'route' => $id,
        ]);

        if (!$savedRoute) {
            return new JsonResponse(['success' => false, 'message' => 'Ruta no encontrada en tus guardadas.'], 404);
        }

        $entityManager->remove($savedRoute);
        $entityManager->flush();

        return new JsonResponse(['success' => true, 'message' => 'Ruta eliminada correctamente.']);
    }

    #[Route('/completar/{id}', name: 'app_complete_route', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function completeRoute(int $id, Request $request, EntityManagerInterface $entityManager, StatisticsService $statisticsService): JsonResponse
    {
        if (!$this->isCsrfTokenValid('saved_routes', $request->headers->get('X-CSRF-TOKEN'))) {
            return new JsonResponse(['success' => false, 'message' => 'Token CSRF inválido'], 403);
        }

        $user = $this->getUser();
        $route = $entityManager->getRepository(ClimbingRoute::class)->find($id);

        if (!$route) {
            return new JsonResponse(['success' => false, 'message' => 'Ruta no encontrada.'], 404);
        }

        $existingEntry = $entityManager->getRepository(CompletedRoute::class)->findOneBy([
            'user' => $user,
            'route' => $route,
        ]);

        if (!$existingEntry) {
            $data = json_decode($request->getContent(), true) ?? [];

            $attemptType = AttemptType::tryFrom((string) ($data['attemptType'] ?? ''));

            $personalRating = isset($data['personalRating']) ? (int) $data['personalRating'] : null;
            if (null !== $personalRating && ($personalRating < 1 || $personalRating > 5)) {
                $personalRating = null;
            }

            $notes = isset($data['notes']) ? trim((string) $data['notes']) : null;
            if ('' === $notes) {
                $notes = null;
            } elseif (null !== $notes && mb_strlen($notes) > 500) {
                $notes = mb_substr($notes, 0, 500);
            }

            $completedRoute = new CompletedRoute();
            $completedRoute->setUser($user);
            $completedRoute->setRoute($route);
            $completedRoute->setAttemptType($attemptType);
            $completedRoute->setPersonalRating($personalRating);
            $completedRoute->setNotes($notes);

            $entityManager->persist($completedRoute);

            $savedRoute = $entityManager->getRepository(UserRoute::class)->findOneBy([
                'user' => $user,
                'route' => $route,
            ]);

            if ($savedRoute) {
                $entityManager->remove($savedRoute);
            }

            $entityManager->flush();
            $statisticsService->invalidateGeneralStats();

            return new JsonResponse([
                'success' => true,
                'message' => 'Ruta marcada como completada.',
                'route_name' => $route->getName(),
                'route_location' => $route->getLocation()->getName(),
                'route_type' => $route->getRouteType()->value,
                'completed_date' => (new \DateTime())->format('d/m/Y'),
                'attempt_type' => $attemptType?->value,
                'attempt_type_label' => $attemptType?->label(),
                'personal_rating' => $personalRating,
                'notes' => $notes,
            ]);
        }

        return new JsonResponse(['success' => false, 'message' => 'Ya completaste esta ruta.']);
    }

    #[Route('/check-completed', name: 'app_check_completed_route', methods: ['GET'])]
    public function checkCompletedRoutes(EntityManagerInterface $entityManager): JsonResponse
    {
        $user = $this->getUser();

        $completedRoutes = $entityManager->getRepository(CompletedRoute::class)->findBy(['user' => $user]);
        $completedRouteIds = array_map(fn ($cr) => $cr->getRoute()->getId(), $completedRoutes);

        return new JsonResponse(['completedRoutes' => $completedRouteIds]);
    }
}
