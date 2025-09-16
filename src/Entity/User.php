<?php
namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use App\Repository\UserRepository;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: "users")]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(type: "string", length: 180, unique: true)]
    private ?string $email = null;

    #[ORM\Column(type: "json")]
    private array $roles = [];

    #[ORM\Column(type: "string")]
    private ?string $password = null;

    #[ORM\Column(type: 'string', length: 255, nullable: false)]
    #[Assert\NotBlank(message: "El nombre no puede estar vacío.")]
    private string $name;

    #[ORM\OneToMany(mappedBy: "user", targetEntity: UserRoute::class, cascade: ["remove"], orphanRemoval: true)]
    private Collection $savedRoutes;

    public function __construct()
    {
        $this->savedRoutes = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): self
    {
        $this->email = $email;
        return $this;
    }

    public function getRoles(): array
    {
        // Garantiza que al menos todos los usuarios tengan ROLE_USER
        $roles = $this->roles;
        if (!in_array('ROLE_USER', $roles, true)) {
            $roles[] = 'ROLE_USER';
        }
        return array_unique($roles);
    }

    public function setRoles(array $roles): self
    {
        $this->roles = $roles;
        return $this;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): self
    {
        $this->password = $password;
        return $this;
    }

    public function eraseCredentials():void {}

    public function getUserIdentifier(): string
    {
        return $this->email;
    }

    // Métodos para la relación con UserRoute
    public function getSavedRoutes(): Collection
    {
        return $this->savedRoutes;
    }

    public function addSavedRoute(UserRoute $userRoute): self
    {
        if (!$this->savedRoutes->contains($userRoute)) {
            $this->savedRoutes->add($userRoute);
            $userRoute->setUser($this);
        }
        return $this;
    }

    public function removeSavedRoute(UserRoute $userRoute): self
    {
        if ($this->savedRoutes->removeElement($userRoute)) {
            if ($userRoute->getUser() === $this) {
                $userRoute->setUser(null);
            }
        }
        return $this;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;
        return $this;
    }
}
