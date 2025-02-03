<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use App\Entity\ClimbingRoute;
use App\Repository\ClimbingRouteRepository;
use Symfony\Component\HttpFoundation\Request;
use Doctrine\ORM\EntityManagerInterface;
use App\Form\ClimbingRouteType;

#[Route('/route')]
class RouteController extends AbstractController
{
    #[Route(name: 'app_route_index', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function index(ClimbingRouteRepository $routeRepository): Response
    {
        $routes = $routeRepository->findAll();
        return $this->render('route/index.html.twig', ['routes' => $routes]);
    }

    #[Route('/new', name: 'app_route_new', methods: ['GET', 'POST'])]
    #[IsGranted('ROLE_ADMIN')]
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

        return $this->render('route/new.html.twig', ['form' => $form->createView()]);
    }

    #[Route('/{id}/edit', name: 'app_route_edit', methods: ['GET', 'POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function edit(Request $request, ClimbingRoute $route, EntityManagerInterface $entityManager): Response
    {
        $form = $this->createForm(ClimbingRouteType::class, $route);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();
            return $this->redirectToRoute('app_route_index');
        }

        return $this->render('route/edit.html.twig', ['form' => $form->createView()]);
    }

    #[Route('/{id}/delete', name: 'app_route_delete', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function delete(Request $request, ClimbingRoute $route, EntityManagerInterface $entityManager): Response
    {
        if ($this->isCsrfTokenValid('delete'.$route->getId(), $request->request->get('_token'))) {
            $entityManager->remove($route);
            $entityManager->flush();
        }
        return $this->redirectToRoute('app_route_index');
    }
}
