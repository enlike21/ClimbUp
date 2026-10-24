<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Base schema: the tables every later migration builds on (users, locations, routes, saved
 * and completed routes, messenger queue), as they were before Version20251208120000.
 *
 * They used to come from an SQL dump that is no longer part of the repository, so without
 * this migration a fresh install could not get past the first ALTER TABLE. Databases that
 * already have these tables (any install made before this file existed) skip it.
 */
final class Version20250101000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Base schema: users, location, climbing_route, user_route, completed_route, messenger_messages';
    }

    public function up(Schema $schema): void
    {
        $this->skipIf($schema->hasTable('users'), 'Base schema already exists (install older than this migration).');

        $this->addSql('CREATE TABLE users (id INT AUTO_INCREMENT NOT NULL, email VARCHAR(180) NOT NULL, roles JSON NOT NULL, password VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, UNIQUE INDEX UNIQ_1483A5E9E7927C74 (email), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE location (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) NOT NULL, latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE climbing_route (id INT AUTO_INCREMENT NOT NULL, location_id INT NOT NULL, name VARCHAR(255) NOT NULL, route_type VARCHAR(20) NOT NULL, difficulty VARCHAR(255) NOT NULL, pitches INT NOT NULL, length INT NOT NULL, INDEX IDX_C69732064D218E (location_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE user_route (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, route_id INT NOT NULL, INDEX IDX_E006DB21A76ED395 (user_id), INDEX IDX_E006DB2134ECB4E6 (route_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE completed_route (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, route_id INT NOT NULL, completed_at DATETIME NOT NULL, INDEX IDX_2DCFDE0BA76ED395 (user_id), INDEX IDX_2DCFDE0B34ECB4E6 (route_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE messenger_messages (id BIGINT AUTO_INCREMENT NOT NULL, body LONGTEXT NOT NULL, headers LONGTEXT NOT NULL, queue_name VARCHAR(190) NOT NULL, created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', available_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', delivered_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_75EA56E0FB7336F0 (queue_name), INDEX IDX_75EA56E0E3BD61CE (available_at), INDEX IDX_75EA56E016BA31DB (delivered_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE climbing_route ADD CONSTRAINT FK_C69732064D218E FOREIGN KEY (location_id) REFERENCES location (id)');
        $this->addSql('ALTER TABLE user_route ADD CONSTRAINT FK_E006DB21A76ED395 FOREIGN KEY (user_id) REFERENCES users (id)');
        $this->addSql('ALTER TABLE user_route ADD CONSTRAINT FK_E006DB2134ECB4E6 FOREIGN KEY (route_id) REFERENCES climbing_route (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE completed_route ADD CONSTRAINT FK_2DCFDE0BA76ED395 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE completed_route ADD CONSTRAINT FK_2DCFDE0B34ECB4E6 FOREIGN KEY (route_id) REFERENCES climbing_route (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE completed_route DROP FOREIGN KEY FK_2DCFDE0B34ECB4E6');
        $this->addSql('ALTER TABLE completed_route DROP FOREIGN KEY FK_2DCFDE0BA76ED395');
        $this->addSql('ALTER TABLE user_route DROP FOREIGN KEY FK_E006DB2134ECB4E6');
        $this->addSql('ALTER TABLE user_route DROP FOREIGN KEY FK_E006DB21A76ED395');
        $this->addSql('ALTER TABLE climbing_route DROP FOREIGN KEY FK_C69732064D218E');
        $this->addSql('DROP TABLE messenger_messages');
        $this->addSql('DROP TABLE completed_route');
        $this->addSql('DROP TABLE user_route');
        $this->addSql('DROP TABLE climbing_route');
        $this->addSql('DROP TABLE location');
        $this->addSql('DROP TABLE users');
    }
}
