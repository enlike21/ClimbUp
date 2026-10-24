<?php

// src/Form/RegistrationFormType.php

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
 * Form type for user registration.
 *
 * Includes comprehensive validation constraints for all fields
 */
class RegistrationFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('email', EmailType::class, [
                'label' => 'Correo Electrónico',
                'constraints' => [
                    new Assert\NotBlank([
                        'message' => 'Por favor ingresa tu correo electrónico',
                    ]),
                    new Assert\Email([
                        'message' => 'Por favor ingresa un correo electrónico válido',
                    ]),
                    new Assert\Length([
                        'max' => 180,
                        'maxMessage' => 'El correo no puede tener más de {{ limit }} caracteres',
                    ]),
                ],
                'attr' => [
                    'autocomplete' => 'email',
                ],
            ])
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
                    'autocomplete' => 'name',
                ],
            ])
            ->add('plainPassword', RepeatedType::class, [
                'type' => PasswordType::class,
                'mapped' => false, // Not mapped to entity - we handle it manually
                'first_options' => [
                    'label' => 'Contraseña',
                    'attr' => [
                        'autocomplete' => 'new-password',
                    ],
                ],
                'second_options' => [
                    'label' => 'Repetir Contraseña',
                    'attr' => [
                        'autocomplete' => 'new-password',
                    ],
                ],
                'invalid_message' => 'Las contraseñas deben coincidir',
                'constraints' => [
                    new Assert\NotBlank([
                        'message' => 'Por favor ingresa una contraseña',
                    ]),
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
            ])
            // Honeypot: hidden from people with CSS, but naive bots fill in every field they
            // find. RegistrationController quietly drops any submission that has it set.
            ->add('website', TextType::class, [
                'mapped' => false,
                'required' => false,
                'label' => 'Deja este campo vacío',
                'attr' => [
                    'autocomplete' => 'off',
                    'tabindex' => '-1',
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
