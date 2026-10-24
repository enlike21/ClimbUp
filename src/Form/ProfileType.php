<?php

// src/Form/ProfileType.php

namespace App\Form;

use App\Entity\User;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\RepeatedType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Form type for user profile editing.
 *
 * Includes validation for:
 * - Name format and length
 * - Password strength (when changing)
 * - Current password, required by the controller whenever the password changes
 * - Email display (read-only)
 */
class ProfileType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Nombre',
                'constraints' => [
                    new Assert\NotBlank([
                        'message' => 'Por favor ingresa tu nombre',
                    ]),
                    new Assert\Length([
                        'min' => 2,
                        'max' => 100,
                        'minMessage' => 'El nombre debe tener al menos {{ limit }} caracteres',
                        'maxMessage' => 'El nombre no puede tener más de {{ limit }} caracteres',
                    ]),
                    new Assert\Regex([
                        'pattern' => '/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/u',
                        'message' => 'El nombre solo puede contener letras y espacios',
                    ]),
                ],
                'attr' => [
                    'placeholder' => 'Tu nombre completo',
                ],
            ])
            ->add('email', EmailType::class, [
                'label' => 'Correo Electrónico',
                'disabled' => true, // Email cannot be changed
                'attr' => [
                    'class' => 'form-control-readonly',
                    'readonly' => true,
                ],
                'help' => 'El correo electrónico no se puede modificar',
            ])
            ->add('currentPassword', PasswordType::class, [
                'label' => 'Contraseña actual',
                'mapped' => false,
                'required' => false, // only checked when a new password is set (see ProfileController)
                'attr' => [
                    'autocomplete' => 'current-password',
                ],
            ])
            ->add('plainPassword', RepeatedType::class, [
                'type' => PasswordType::class,
                'mapped' => false, // Not mapped to entity - handled manually
                'required' => false, // Optional - only if user wants to change password
                'first_options' => [
                    'label' => 'Nueva Contraseña',
                    'attr' => [
                        'placeholder' => 'Dejar en blanco para no cambiar',
                        'autocomplete' => 'new-password',
                    ],
                ],
                'second_options' => [
                    'label' => 'Confirmar Nueva Contraseña',
                    'attr' => [
                        'placeholder' => 'Repite la nueva contraseña',
                        'autocomplete' => 'new-password',
                    ],
                ],
                'invalid_message' => 'Las contraseñas deben coincidir',
                'constraints' => [
                    new Assert\Length([
                        'min' => 8,
                        'minMessage' => 'La contraseña debe tener al menos {{ limit }} caracteres',
                        'max' => 4096,
                    ]),
                    new Assert\Regex([
                        'pattern' => '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/',
                        'message' => 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
                    ]),
                ],
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => User::class,
        ]);
    }
}
