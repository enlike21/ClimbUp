<?php

namespace App\Controller\Admin;

use App\Entity\ClimbingRoute;
use App\Form\ClimbingRouteType;
use App\Repository\ClimbingRouteRepository;
use App\Repository\UserRepository;
use App\Service\StatisticsService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/route')]
#[IsGranted('ROLE_ADMIN')]
class AdminRouteController extends AbstractController
{
    #[Route('', name: 'app_route_index', methods: ['GET'])]
    public function index(ClimbingRouteRepository $routeRepository, UserRepository $userRepository): Response
    {
        return $this->render('admin/route_management.html.twig', [
            'routes' => $routeRepository->findAll(),
            'users' => $userRepository->findAll(),
        ]);
    }

    #[Route('/new', name: 'app_route_new', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $entityManager, StatisticsService $statisticsService): Response
    {
        $route = new ClimbingRoute();
        $form = $this->createForm(ClimbingRouteType::class, $route);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($route);
            $entityManager->flush();
            $statisticsService->invalidateGeneralStats();

            return $this->redirectToRoute('app_route_index');
        }

        return $this->render('route/management/new.html.twig', ['form' => $form->createView()]);
    }

    #[Route('/{id}/edit', name: 'app_route_edit', requirements: ['id' => '\d+'], methods: ['GET', 'POST'])]
    public function edit(Request $request, ClimbingRoute $route, EntityManagerInterface $entityManager): Response
    {
        $form = $this->createForm(ClimbingRouteType::class, $route);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();

            return $this->redirectToRoute('app_route_index');
        }

        return $this->render('route/management/edit.html.twig', ['form' => $form->createView()]);
    }

    #[Route('/{id}/delete', name: 'app_route_delete', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function delete(Request $request, ClimbingRoute $route, EntityManagerInterface $entityManager, StatisticsService $statisticsService): Response
    {
        if ($this->isCsrfTokenValid('delete'.$route->getId(), $request->request->get('_token'))) {
            $entityManager->remove($route);
            $entityManager->flush();
            $statisticsService->invalidateGeneralStats();
        }

        return $this->redirectToRoute('app_route_index');
    }
}
