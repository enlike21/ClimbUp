<?php

namespace App\Controller\Admin;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\StatisticsService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/route/admin')]
#[IsGranted('ROLE_ADMIN')]
class AdminController extends AbstractController
{
    #[Route('', name: 'app_admin_dashboard', methods: ['GET'])]
    public function dashboard(StatisticsService $statisticsService): Response
    {
        return $this->render('admin/dashboard.html.twig', [
            'stats' => $statisticsService->getAdminStats(),
        ]);
    }

    #[Route('/users', name: 'app_user_management', methods: ['GET'])]
    public function manageUsers(UserRepository $userRepository, Request $request): Response
    {
        $page = max(1, $request->query->getInt('page', 1));
        $pagination = $userRepository->findPaginated($page);

        return $this->render('admin/users_management.html.twig', $pagination);
    }

    #[Route('/grant-admin/{id}', name: 'app_grant_admin', methods: ['POST'])]
    public function grantAdmin(User $user, EntityManagerInterface $entityManager, Request $request): Response
    {
        if (!$this->isCsrfTokenValid('grant_admin_'.$user->getId(), $request->request->get('_token'))) {
            $this->addFlash('error', 'Token CSRF inválido.');

            return $this->redirectToRoute('app_user_management');
        }

        if (!in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            $user->setRoles([...$user->getRoles(), 'ROLE_ADMIN']);
            $entityManager->flush();
            $this->addFlash('success', 'El usuario ahora es administrador.');
        }

        return $this->redirectToRoute('app_user_management');
    }

    #[Route('/delete-user/{id}', name: 'app_delete_user', methods: ['POST'])]
    public function deleteUser(User $user, EntityManagerInterface $entityManager, Request $request, StatisticsService $statisticsService): Response
    {
        if ($user === $this->getUser()) {
            // Deleting your own account from here would also lock you out of the admin.
            $this->addFlash('error', 'No puedes eliminar tu propia cuenta desde la administración.');

            return $this->redirectToRoute('app_user_management');
        }

        if ($this->isCsrfTokenValid('delete_user_'.$user->getId(), $request->request->get('_token'))) {
            $entityManager->remove($user);
            $entityManager->flush();
            $statisticsService->invalidateGeneralStats();
            $this->addFlash('success', 'Usuario eliminado correctamente.');
        }

        return $this->redirectToRoute('app_user_management');
    }
}
