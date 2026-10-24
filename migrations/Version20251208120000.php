<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20251208120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add created_at and updated_at timestamp columns to users table';
    }

    public function up(Schema $schema): void
    {
        // Add created_at if not exists
        $this->addSql("
            ALTER TABLE users 
            ADD COLUMN created_at DATETIME NOT NULL 
            DEFAULT CURRENT_TIMESTAMP 
            COMMENT '(DC2Type:datetime_immutable)'
        ");

        // Add updated_at if not exists
        $this->addSql("
            ALTER TABLE users 
            ADD COLUMN updated_at DATETIME DEFAULT NULL 
            COMMENT '(DC2Type:datetime_immutable)'
        ");

        // Remove default from created_at (we only want it for existing rows)
        $this->addSql('
            ALTER TABLE users 
            ALTER COLUMN created_at DROP DEFAULT
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE users DROP COLUMN created_at');
        $this->addSql('ALTER TABLE users DROP COLUMN updated_at');
    }
}
