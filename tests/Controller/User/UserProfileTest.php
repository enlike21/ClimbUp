<?php

namespace App\Tests\Controller\User;

use App\Controller\User\UserProfile;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserProfileTest extends TestCase
{
    public function testUpdateProfileHashesAndSetsNewPasswordWhenProvided(): void
    {
        $user = new User();
        $user->setEmail('climber@example.com');
        $user->setName('Climber');

        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->once())->method('flush');

        $passwordHasher = $this->createMock(UserPasswordHasherInterface::class);
        $passwordHasher->expects($this->once())
            ->method('hashPassword')
            ->with($user, 'new-password')
            ->willReturn('new-hashed-password');

        $logger = $this->createMock(LoggerInterface::class);

        $service = new UserProfile($entityManager, $passwordHasher, $logger);
        $service->updateProfile($user, 'new-password');

        $this->assertSame('new-hashed-password', $user->getPassword());
    }

    public function testUpdateProfileLeavesPasswordUntouchedWhenNotProvided(): void
    {
        $user = new User();
        $user->setEmail('climber@example.com');
        $user->setName('Climber');
        $user->setPassword('existing-hashed-password');

        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->once())->method('flush');

        $passwordHasher = $this->createMock(UserPasswordHasherInterface::class);
        $passwordHasher->expects($this->never())->method('hashPassword');

        $logger = $this->createMock(LoggerInterface::class);

        $service = new UserProfile($entityManager, $passwordHasher, $logger);
        $service->updateProfile($user, null);

        $this->assertSame('existing-hashed-password', $user->getPassword());
    }
}
