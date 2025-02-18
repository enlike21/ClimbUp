<?php

namespace App\Form;

use App\Entity\Location;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class LocationType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Nombre de la localización',
                'attr' => [
                    'class' => 'form-control',
                    'placeholder' => 'Ejemplo: El Chorro, Málaga'
                ]
            ])
            ->add('latitude', NumberType::class, [
                'label' => 'Latitud',
                'attr' => [
                    'class' => 'form-control',
                    'placeholder' => 'Ejemplo: 36.9205'
                ],
                'scale' => 6
            ])
            ->add('longitude', NumberType::class, [
                'label' => 'Longitud',
                'attr' => [
                    'class' => 'form-control',
                    'placeholder' => 'Ejemplo: -4.7603'
                ],
                'scale' => 6
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Location::class,
        ]);
    }
}
