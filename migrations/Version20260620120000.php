<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260620120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add region to location, add rating/url/sector to climbing_route, add index on location.region';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE location ADD region VARCHAR(100) DEFAULT NULL');
        $this->addSql('CREATE INDEX idx_location_region ON location (region)');

        $this->addSql('ALTER TABLE climbing_route ADD rating DOUBLE PRECISION DEFAULT NULL');
        $this->addSql('ALTER TABLE climbing_route ADD url VARCHAR(500) DEFAULT NULL');
        $this->addSql('ALTER TABLE climbing_route ADD sector VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_location_region ON location');
        $this->addSql('ALTER TABLE location DROP region');

        $this->addSql('ALTER TABLE climbing_route DROP rating');
        $this->addSql('ALTER TABLE climbing_route DROP url');
        $this->addSql('ALTER TABLE climbing_route DROP sector');
    }
}
