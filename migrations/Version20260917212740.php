<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260917212740 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add attempt_type, personal_rating and notes to completed_route for richer ascent logging';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE completed_route ADD attempt_type VARCHAR(20) DEFAULT NULL, ADD personal_rating SMALLINT DEFAULT NULL, ADD notes VARCHAR(500) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE completed_route DROP attempt_type, DROP personal_rating, DROP notes');
    }
}
