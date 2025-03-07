<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250226221526 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE completed_route DROP FOREIGN KEY FK_2DCFDE0BA76ED395');
        $this->addSql('ALTER TABLE completed_route ADD CONSTRAINT FK_2DCFDE0BA76ED395 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE completed_route DROP FOREIGN KEY FK_2DCFDE0BA76ED395');
        $this->addSql('ALTER TABLE completed_route ADD CONSTRAINT FK_2DCFDE0BA76ED395 FOREIGN KEY (user_id) REFERENCES users (id)');
    }
}
