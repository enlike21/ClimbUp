<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250226221154 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE completed_route DROP FOREIGN KEY FK_2DCFDE0B34ECB4E6');
        $this->addSql('ALTER TABLE completed_route ADD CONSTRAINT FK_2DCFDE0B34ECB4E6 FOREIGN KEY (route_id) REFERENCES climbing_route (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE user_route DROP FOREIGN KEY FK_E006DB2134ECB4E6');
        $this->addSql('ALTER TABLE user_route ADD CONSTRAINT FK_E006DB2134ECB4E6 FOREIGN KEY (route_id) REFERENCES climbing_route (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE user_route DROP FOREIGN KEY FK_E006DB2134ECB4E6');
        $this->addSql('ALTER TABLE user_route ADD CONSTRAINT FK_E006DB2134ECB4E6 FOREIGN KEY (route_id) REFERENCES climbing_route (id)');
        $this->addSql('ALTER TABLE completed_route DROP FOREIGN KEY FK_2DCFDE0B34ECB4E6');
        $this->addSql('ALTER TABLE completed_route ADD CONSTRAINT FK_2DCFDE0B34ECB4E6 FOREIGN KEY (route_id) REFERENCES climbing_route (id)');
    }
}
