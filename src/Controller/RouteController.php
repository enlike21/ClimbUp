<?php

namespace App\Controller;

use App\Entity\ClimbingRoute;
use App\Form\ClimbingRouteType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use App\Repository\ClimbingRouteRepository;

#[Route('/route')]
final class RouteController extends AbstractController
{
    #[Route(name: 'app_route_index', methods: ['GET'])]
    public function index(ClimbingRouteRepository $routeRepository): Response
    {
        return $this->render('route/index.html.twig', [
            'routes' => $routeRepository->findAll(),
        ]);
    }

    #[Route('/new', name: 'app_route_new', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $entityManager): Response
    {
        $route = new ClimbingRoute();
        $form = $this->createForm(ClimbingRouteType::class, $route);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($route);
            $entityManager->flush();

            return $this->redirectToRoute('app_route_index');
        }

        return $this->render('route/new.html.twig', [
            'route' => $route,
            'form' => $form->createView(),
        ]);
    }

    #[Route('/{id}', name: 'app_route_show', methods: ['GET'])]
    public function show(ClimbingRoute $route): Response
    {
        return $this->render('route/show.html.twig', [
            'route' => $route,
        ]);
    }

    #[Route('/{id}/edit', name: 'app_route_edit', methods: ['GET', 'POST'])]
    public function edit(Request $request, ClimbingRoute $route, EntityManagerInterface $entityManager): Response
    {
        $form = $this->createForm(ClimbingRouteType::class, $route);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();

            return $this->redirectToRoute('app_route_index');
        }

        return $this->render('route/edit.html.twig', [
            'route' => $route,
            'form' => $form->createView(),
        ]);
    }

    #[Route('/{id}', name: 'app_route_delete', methods: ['POST'])]
    public function delete(Request $request, ClimbingRoute $route, EntityManagerInterface $entityManager): Response
    {
        if ($this->isCsrfTokenValid('delete' . $route->getId(), $request->request->get('_token'))) {
            $entityManager->remove($route);
            $entityManager->flush();

            $this->addFlash('success', 'Ruta eliminada correctamente.');
        }

        return $this->redirectToRoute('app_route_index');
    }
}
