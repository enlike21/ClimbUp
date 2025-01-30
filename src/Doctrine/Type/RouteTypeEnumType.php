<?php
namespace App\Doctrine\Type;

use App\Enum\RouteType;
use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\Type;

class RouteTypeEnumType extends Type
{
public const NAME = 'route_type_enum';

public function getSQLDeclaration(array $fieldDeclaration, AbstractPlatform $platform): string
{
return "ENUM('Boulder', 'Sport', 'Trad')";
}

    public function convertToDatabaseValue($value, AbstractPlatform $platform): ?string
    {
        if ($value === null) {
            return null;
        }

        if (!$value instanceof RouteType) {
            throw new \InvalidArgumentException('Expected a RouteType enum.');
        }

        return $value->value; // Devuelve el valor string del enum
    }

    public function convertToPHPValue($value, AbstractPlatform $platform): ?RouteType
    {
        return $value !== null ? RouteType::from($value) : null; // Convierte el string al enum
    }

public function getName(): string
{
return self::NAME;
}
}
