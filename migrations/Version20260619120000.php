<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260619120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add indexes on user_id and route_id for user_route and completed_route tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE INDEX idx_user_route_user ON user_route (user_id)');
        $this->addSql('CREATE INDEX idx_user_route_route ON user_route (route_id)');
        $this->addSql('CREATE INDEX idx_completed_route_user ON completed_route (user_id)');
        $this->addSql('CREATE INDEX idx_completed_route_route ON completed_route (route_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_user_route_user ON user_route');
        $this->addSql('DROP INDEX idx_user_route_route ON user_route');
        $this->addSql('DROP INDEX idx_completed_route_user ON completed_route');
        $this->addSql('DROP INDEX idx_completed_route_route ON completed_route');
    }
}
