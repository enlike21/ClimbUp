<?php

namespace App\Controller\User;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserProfile
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function updateProfile(User $user, ?string $newPassword = null): void
    {
        try {
            // Hash new password if provided
            if ($newPassword) {
                $hashedPassword = $this->passwordHasher->hashPassword($user, $newPassword);
                $user->setPassword($hashedPassword);

                $this->logger->info('User password updated', [
                    'user_id' => $user->getId(),
                ]);
            }

            // Persist changes
            $this->entityManager->flush();

            $this->logger->info('User profile updated successfully', [
                'user_id' => $user->getId(),
            ]);
        } catch (\Exception $e) {
            $this->logger->error('Error updating user profile', [
                'user_id' => $user->getId(),
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
