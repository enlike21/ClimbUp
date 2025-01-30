<?php

namespace App\Form;

use App\Entity\ClimbingRoute;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use App\Entity\Location;

class ClimbingRouteType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Nombre de la Ruta'
            ])
            ->add('url', TextType::class, [
                'label' => 'URL'
            ])
            ->add('routeType', TextType::class, [
                'label' => 'Tipo de Ruta'
            ])
            ->add('rating', TextType::class, [
                'label' => 'Rating'
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
