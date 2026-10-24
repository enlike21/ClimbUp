<?php

namespace App\Form;

use App\Entity\ClimbingRoute;
use App\Entity\Location;
use App\Enum\RouteType;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\UrlType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints as Assert;

class ClimbingRouteType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Nombre de la Ruta',
                'constraints' => [
                    new Assert\NotBlank(message: 'El nombre es obligatorio'),
                    new Assert\Length(
                        min: 2,
                        max: 255,
                        minMessage: 'El nombre debe tener al menos {{ limit }} caracteres',
                        maxMessage: 'El nombre no puede superar los {{ limit }} caracteres',
                    ),
                ],
                'attr' => ['placeholder' => 'Ej: Vía del Espolón'],
            ])
            ->add('routeType', ChoiceType::class, [
                'label' => 'Tipo de Escalada',
                'choices' => RouteType::cases(),
                'choice_value' => fn (?RouteType $type) => $type?->value,
                'choice_label' => fn ($choice) => $choice->value,
                'constraints' => [
                    new Assert\NotNull(message: 'Selecciona un tipo de escalada'),
                ],
            ])
            ->add('difficulty', TextType::class, [
                'label' => 'Dificultad',
                'constraints' => [
                    new Assert\NotBlank(message: 'La dificultad es obligatoria'),
                    new Assert\Length(max: 20, maxMessage: 'La dificultad no puede superar los {{ limit }} caracteres'),
                ],
                'attr' => ['placeholder' => 'Ej: 6a+'],
            ])
            ->add('length', IntegerType::class, [
                'label' => 'Longitud (metros)',
                'constraints' => [
                    new Assert\NotBlank(message: 'La longitud es obligatoria'),
                    new Assert\Positive(message: 'La longitud debe ser un número positivo'),
                ],
                'attr' => ['placeholder' => 'Ej: 25', 'min' => 1],
            ])
            ->add('pitches', IntegerType::class, [
                'label' => 'Número de Largos',
                'constraints' => [
                    new Assert\NotBlank(message: 'El número de largos es obligatorio'),
                    new Assert\Positive(message: 'Debe ser al menos 1 largo'),
                ],
                'attr' => ['placeholder' => 'Ej: 1', 'min' => 1],
            ])
            ->add('location', EntityType::class, [
                'class' => Location::class,
                'choice_label' => 'name',
                'label' => 'Ubicación',
                'placeholder' => 'Selecciona una ubicación',
                'constraints' => [
                    new Assert\NotNull(message: 'Selecciona una ubicación'),
                ],
            ])
            ->add('sector', TextType::class, [
                'label' => 'Sector',
                'required' => false,
                'attr' => ['placeholder' => 'Ej: Sector Central'],
            ])
            ->add('rating', NumberType::class, [
                'label' => 'Valoración (0-4)',
                'required' => false,
                'scale' => 1,
                'attr' => ['placeholder' => 'Ej: 3.5', 'min' => 0, 'max' => 4, 'step' => 0.1],
            ])
            ->add('url', UrlType::class, [
                'label' => 'URL de la fuente',
                'required' => false,
                'attr' => ['placeholder' => 'https://www.mountainproject.com/route/...'],
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => ClimbingRoute::class,
        ]);
    }
}
