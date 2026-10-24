<?php

// src/Controller/Security/RegistrationController.php

namespace App\Controller\Security;

use App\Controller\Security\Registration\UserRegistration;
use App\Entity\User;
use App\Exception\UserAlreadyExistsException;
use App\Form\RegistrationFormType;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\FormError;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

class RegistrationController extends AbstractController
{
    public function __construct(
        private readonly UserRegistration $userRegistration,
    ) {
    }

    #[Route('/register', name: 'app_register', methods: ['GET', 'POST'])]
    public function register(Request $request, RateLimiterFactoryInterface $registrationLimiter): Response
    {
        if ($this->getUser()) {
            return $this->redirectToRoute('homepage');
        }

        $user = new User();
        $form = $this->createForm(RegistrationFormType::class, $user);
        $form->handleRequest($request);

        if ($form->isSubmitted()) {
            // A filled-in honeypot means a bot: pretend it worked and create nothing.
            if ('' !== trim((string) $form->get('website')->getData())) {
                return $this->redirectToRoute('login');
            }

            if (!$registrationLimiter->create($request->getClientIp())->consume()->isAccepted()) {
                $this->addFlash('error', 'Demasiados intentos de registro. Inténtalo de nuevo más tarde.');

                return $this->render('registration/register.html.twig', [
                    'registrationForm' => $form->createView(),
                ], new Response(null, Response::HTTP_TOO_MANY_REQUESTS));
            }
        }

        if ($form->isSubmitted() && $form->isValid()) {
            try {
                $plainPassword = $form->get('plainPassword')->getData();
                $this->userRegistration->registerUser($user, $plainPassword);

                $this->addFlash('success', sprintf(
                    '¡Bienvenido %s! Tu cuenta ha sido creada exitosamente.',
                    $user->getName()
                ));

                return $this->redirectToRoute('login');
            } catch (UserAlreadyExistsException $e) {
                $form->get('email')->addError(new FormError(
                    'Este correo electrónico ya está en uso. Por favor, ingresa otro.'
                ));
            } catch (\Exception $e) {
                $this->addFlash('error',
                    'Ha ocurrido un error durante el registro. Por favor, inténtalo de nuevo.'
                );
            }
        }

        return $this->render('registration/register.html.twig', [
            'registrationForm' => $form->createView(),
        ]);
    }
}
