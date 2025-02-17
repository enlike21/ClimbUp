<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250217204626 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE completed_route (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, route_id INT NOT NULL, completed_at DATETIME NOT NULL, INDEX IDX_2DCFDE0BA76ED395 (user_id), INDEX IDX_2DCFDE0B34ECB4E6 (route_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE completed_route ADD CONSTRAINT FK_2DCFDE0BA76ED395 FOREIGN KEY (user_id) REFERENCES users (id)');
        $this->addSql('ALTER TABLE completed_route ADD CONSTRAINT FK_2DCFDE0B34ECB4E6 FOREIGN KEY (route_id) REFERENCES climbing_route (id)');
        $this->addSql('ALTER TABLE user_route DROP FOREIGN KEY FK_user_route_climbingroute');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE completed_route DROP FOREIGN KEY FK_2DCFDE0BA76ED395');
        $this->addSql('ALTER TABLE completed_route DROP FOREIGN KEY FK_2DCFDE0B34ECB4E6');
        $this->addSql('DROP TABLE completed_route');
        $this->addSql('ALTER TABLE user_route ADD CONSTRAINT FK_user_route_climbingroute FOREIGN KEY (route_id) REFERENCES climbing_route (id) ON DELETE CASCADE');
    }
}
