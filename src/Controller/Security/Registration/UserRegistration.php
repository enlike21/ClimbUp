<?php

namespace App\Controller\Security\Registration;

use App\Entity\User;
use App\Exception\UserAlreadyExistsException;
use App\Service\StatisticsService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

readonly class UserRegistration
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private UserPasswordHasherInterface $passwordHasher,
        private LoggerInterface $logger,
        private StatisticsService $statisticsService,
    ) {
    }

    public function registerUser(User $user, string $plainPassword): void
    {
        try {
            $hashedPassword = $this->passwordHasher->hashPassword($user, $plainPassword);
            $user->setPassword($hashedPassword);

            $user->setRoles(['ROLE_USER']);

            $this->entityManager->persist($user);
            $this->entityManager->flush();
            $this->statisticsService->invalidateGeneralStats();

            // Ids only - no emails or names in the logs.
            $this->logger->info('New user registered successfully', [
                'user_id' => $user->getId(),
            ]);
        } catch (\Doctrine\DBAL\Exception\UniqueConstraintViolationException $e) {
            $this->logger->warning('Registration attempt with an email that is already registered');

            throw new UserAlreadyExistsException('A user with this email already exists', $e);
        } catch (\Exception $e) {
            $this->logger->error('Unexpected error during user registration', [
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
