<?php

namespace App\Form;

use App\Entity\ClimbingRoute;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use App\Entity\Location;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use App\Enum\RouteType;

class ClimbingRouteType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Nombre de la Ruta'
            ])
            ->add('routeType', ChoiceType::class, [
                'choices' => [
                    'Boulder' => RouteType::BOULDER,
                    'Sport' => RouteType::SPORT,
                    'Trad' => RouteType::TRAD,
                ],
                'choice_label' => fn($choice) => $choice->value,
            ])
            ->add('difficulty', TextType::class, [
                'label' => 'difficulty'
            ])
            ->add('length', TextType::class, [ // Asegúrate de que 'length' coincide con la entidad
                'label' => 'Longitud (en metros)',
            ])
            ->add('pitches', TextType::class, [
                    'label' => 'Tramos',
            ])
            ->add('location', EntityType::class, [
                'class' => Location::class, // Clase relacionada
                'choice_label' => 'name',   // Campo a mostrar en el formulario
                'label' => 'Ubicación',
                'placeholder' => 'Seleccione una ubicación',
            ]);


    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => ClimbingRoute::class,
        ]);
    }
}
