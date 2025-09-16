<?php

namespace App\Controller\Route;

use App\Entity\ClimbingRoute;
use App\Entity\User;
use App\Form\ClimbingRouteType;
use App\Repository\ClimbingRouteRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/route')]
class RouteController extends AbstractController
{
    #[Route(name: 'app_route_index', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function index(ClimbingRouteRepository $routeRepository, UserRepository $userRepository): Response
    {
        $routes = $routeRepository->findAll();
        $users = $userRepository->findAll();

        return $this->render('admin/route_management.html.twig', [
            'routes' => $routes,
            'users' => $users
        ]);
    }

    #[Route('/admin', name: 'app_admin_dashboard', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function adminDashboard(): Response
    {
        return $this->render('admin/dashboard.html.twig');
    }

    #[Route('/admin/users', name: 'app_user_management', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function manageUsers(UserRepository $userRepository): Response
    {
        $users = $userRepository->findAll();

        return $this->render('admin/users_management.html.twig', [
            'users' => $users,
        ]);
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

        return $this->render('route/management/new.html.twig', ['form' => $form->createView()]);
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

        return $this->render('route/management/edit.html.twig', ['form' => $form->createView()]);
    }

    #[Route('/{id}/delete', name: 'app_route_delete', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function delete(Request $request, ClimbingRoute $route, EntityManagerInterface $entityManager): Response
    {
        if ($this->isCsrfTokenValid('delete' . $route->getId(), $request->request->get('_token'))) {
            $entityManager->remove($route);
            $entityManager->flush();
        }
        return $this->redirectToRoute('app_route_index');
    }

    #[Route('/user_routes', name: 'app_route_user_view', methods: ['GET'])]
    public function userView(ClimbingRouteRepository $routeRepository): Response
    {
        $routes = $routeRepository->findAll();

        return $this->render('route/list/user_view.html.twig', [
            'routes' => $routes,
        ]);
    }

    #[Route('/{id}', name: 'app_route_show', methods: ['GET'])]
    public function show(ClimbingRoute $route): Response
    {
        return $this->render('route/details/show.html.twig', [
            'route' => $route,
        ]);
    }

    #[Route('/grant-admin/{id}', name: 'app_grant_admin', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function grantAdmin(User $user, EntityManagerInterface $entityManager): Response
    {
        if (!in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            $user->setRoles(['ROLE_ADMIN']);
            $entityManager->persist($user);
            $entityManager->flush();
            $this->addFlash('success', 'El usuario ahora es administrador.');
        }

        return $this->redirectToRoute('app_user_management');
    }

    #[Route('/delete-user/{id}', name: 'app_delete_user', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function deleteUser(User $user, EntityManagerInterface $entityManager, Request $request): Response
    {
        if ($this->isCsrfTokenValid('delete_user_' . $user->getId(), $request->request->get('_token'))) {
            $entityManager->remove($user);
            $entityManager->flush();
            $this->addFlash('success', 'Usuario eliminado correctamente.');
        }

        return $this->redirectToRoute('app_user_management');
    }
}
