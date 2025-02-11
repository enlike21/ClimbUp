<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250211215236 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE climbing_route DROP url, DROP avg_stars, DROP your_stars');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE climbing_route ADD url VARCHAR(255) NOT NULL, ADD avg_stars DOUBLE PRECISION DEFAULT NULL, ADD your_stars DOUBLE PRECISION DEFAULT NULL');
    }
}
