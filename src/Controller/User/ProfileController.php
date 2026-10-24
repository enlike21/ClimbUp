<?php

namespace App\Controller\User;

use App\Entity\User;
use App\Form\ProfileType;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\FormError;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/perfil')]
#[IsGranted('ROLE_USER')]
class ProfileController extends AbstractController
{
    public function __construct(
        private readonly UserProfile $profileService,
    ) {
    }

    #[Route('/', name: 'app_profile', methods: ['GET', 'POST'])]
    public function edit(Request $request, UserPasswordHasherInterface $passwordHasher): Response
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        $form = $this->createForm(ProfileType::class, $user);
        $form->handleRequest($request);

        // Changing the password needs the current one, so a hijacked or forgotten-open session
        // can't be used to lock the real owner out of their account.
        $newPassword = $form->isSubmitted() ? $form->get('plainPassword')->getData() : null;
        if ($newPassword && !$passwordHasher->isPasswordValid($user, (string) $form->get('currentPassword')->getData())) {
            $form->get('currentPassword')->addError(new FormError('La contraseña actual no es correcta.'));
        }

        if ($form->isSubmitted() && $form->isValid()) {
            try {
                $this->profileService->updateProfile($user, $newPassword);

                $this->addFlash('success', sprintf(
                    '¡Perfil actualizado correctamente, %s!',
                    $user->getName()
                ));

                return $this->redirectToRoute('app_profile');
            } catch (\Exception $e) {
                $this->addFlash('error',
                    'Ha ocurrido un error al actualizar tu perfil. Por favor, inténtalo de nuevo.'
                );
            }
        }

        return $this->render('profile/profile.html.twig', [
            'form' => $form->createView(),
            'user' => $user,
        ]);
    }
}
