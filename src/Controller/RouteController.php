<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Pagerfanta\Doctrine\ORM\QueryAdapter;
use Pagerfanta\Pagerfanta;
use App\Entity\ClimbingRoute;
use App\Repository\ClimbingRouteRepository;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Doctrine\ORM\EntityManagerInterface;
use App\Form\ClimbingRouteType;
use App\Enum\RouteType;

#[Route('/route')]
final class RouteController extends AbstractController
{
    #[Route(name: 'app_route_index', methods: ['GET'])]
    public function index(ClimbingRouteRepository $routeRepository, Request $request): Response
    {
        $queryBuilder = $routeRepository->createQueryBuilder('r');

        // Capturar el filtro desde la URL
        $filter = $request->query->get('filter');

        if (!empty($filter)) {
            $queryBuilder
                ->andWhere('r.routeType = :type')
                ->setParameter('type', $filter);
        }

        // Configurar paginación
        $currentPage = $request->query->getInt('page', 1);
        $perPage = 10;

        $adapter = new QueryAdapter($queryBuilder);
        $pagerfanta = new Pagerfanta($adapter);
        $pagerfanta->setMaxPerPage($perPage);
        $pagerfanta->setCurrentPage($currentPage);

        return $this->render('route/index.html.twig', [
            'routes' => $pagerfanta->getCurrentPageResults(),
            'current_page' => $pagerfanta->getCurrentPage(),
            'total_pages' => $pagerfanta->getNbPages(),
            'filter' => $filter, // Enviar el filtro actual a la vista
        ]);
    }

    #[Route('/new', name: 'app_route_new', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $entityManager): Response
    {
        $route = new ClimbingRoute();
        $form = $this->createForm(ClimbingRouteType::class, $route);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            // No es necesario usar RouteType::from() si ya es del tipo RouteType
            $routeTypeValue = $form->get('routeType')->getData();
            if (!$routeTypeValue instanceof RouteType) {
                $routeTypeValue = RouteType::from($routeTypeValue); // Solo si no es del tipo RouteType
            }
            $route->setRouteType($routeTypeValue);

            $entityManager->persist($route);
            $entityManager->flush();

            $this->addFlash('success', 'Ruta guardada correctamente.');
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
            $routeTypeValue = $form->get('routeType')->getData();
            if (!$routeTypeValue instanceof RouteType) {
                $routeTypeValue = RouteType::from($routeTypeValue);
            }
            $route->setRouteType($routeTypeValue);

            $entityManager->flush();

            $this->addFlash('success', 'Ruta editada correctamente.');
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
