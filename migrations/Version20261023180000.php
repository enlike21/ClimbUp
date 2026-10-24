<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261023180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Al Filo: game_profile (achievements, skin, runs) and game_daily_score (daily challenge leaderboard)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE game_profile (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, achievements JSON NOT NULL, skin VARCHAR(32) NOT NULL, runs INT NOT NULL, UNIQUE INDEX UNIQ_1495D520A76ED395 (user_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE game_daily_score (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, day DATE NOT NULL COMMENT \'(DC2Type:date_immutable)\', height_meters INT NOT NULL, achieved_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_6CED1487A76ED395 (user_id), UNIQUE INDEX UNIQ_GAME_DAILY_USER_DAY (user_id, day), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE game_profile ADD CONSTRAINT FK_1495D520A76ED395 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE game_daily_score ADD CONSTRAINT FK_6CED1487A76ED395 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE game_profile DROP FOREIGN KEY FK_1495D520A76ED395');
        $this->addSql('ALTER TABLE game_daily_score DROP FOREIGN KEY FK_6CED1487A76ED395');
        $this->addSql('DROP TABLE game_profile');
        $this->addSql('DROP TABLE game_daily_score');
    }
}
