<?php

namespace App\Tests\Controller\Security\Registration;

use App\Controller\Security\Registration\UserRegistration;
use App\Entity\User;
use App\Exception\UserAlreadyExistsException;
use App\Service\StatisticsService;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserRegistrationTest extends TestCase
{
    public function testRegisterUserHashesPasswordAssignsRoleAndPersists(): void
    {
        $user = new User();
        $user->setEmail('climber@example.com');
        $user->setName('Climber');

        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->once())->method('persist')->with($user);
        $entityManager->expects($this->once())->method('flush');

        $passwordHasher = $this->createMock(UserPasswordHasherInterface::class);
        $passwordHasher->method('hashPassword')->with($user, 'plain-password')->willReturn('hashed-password');

        $logger = $this->createMock(LoggerInterface::class);

        $statisticsService = $this->createMock(StatisticsService::class);
        $statisticsService->expects($this->once())->method('invalidateGeneralStats');

        $registration = new UserRegistration($entityManager, $passwordHasher, $logger, $statisticsService);
        $registration->registerUser($user, 'plain-password');

        $this->assertSame('hashed-password', $user->getPassword());
        $this->assertSame(['ROLE_USER'], $user->getRoles());
    }

    public function testRegisterUserTranslatesUniqueConstraintViolationIntoDomainException(): void
    {
        $user = new User();
        $user->setEmail('duplicate@example.com');
        $user->setName('Duplicate');

        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->method('flush')->willThrowException(
            $this->createMock(UniqueConstraintViolationException::class)
        );

        $passwordHasher = $this->createMock(UserPasswordHasherInterface::class);
        $passwordHasher->method('hashPassword')->willReturn('hashed-password');

        $logger = $this->createMock(LoggerInterface::class);

        $statisticsService = $this->createMock(StatisticsService::class);
        $statisticsService->expects($this->never())->method('invalidateGeneralStats');

        $registration = new UserRegistration($entityManager, $passwordHasher, $logger, $statisticsService);

        $this->expectException(UserAlreadyExistsException::class);
        $registration->registerUser($user, 'plain-password');
    }
}
