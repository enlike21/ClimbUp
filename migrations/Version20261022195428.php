<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261022195428 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add game_score table for the "A Pulso" minigame global leaderboard (one best-score row per user)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE game_score (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, height_meters INT NOT NULL, achieved_at DATETIME NOT NULL, UNIQUE INDEX UNIQ_GAME_SCORE_USER (user_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE game_score ADD CONSTRAINT FK_GAME_SCORE_USER FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE game_score DROP FOREIGN KEY FK_GAME_SCORE_USER');
        $this->addSql('DROP TABLE game_score');
    }
}
