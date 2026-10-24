<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260621120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Convert YDS grades to French system, add difficulty_order column';
    }

    public function up(Schema $schema): void
    {
        // Add difficulty_order column
        $this->addSql('ALTER TABLE climbing_route ADD difficulty_order INT DEFAULT NULL');

        // Step 1: Strip aid grades (A0, A1, A2, C0, etc.) from difficulty
        $this->addSql("UPDATE climbing_route SET difficulty = TRIM(REGEXP_REPLACE(difficulty, '\\\\s+[AC][0-9][\\\\+\\\\-]?([-/][0-9])?', '')) WHERE difficulty REGEXP '[AC][0-9]'");

        // Step 2: Strip risk modifiers (PG13, R, X) and V-scale suffixes
        $this->addSql("UPDATE climbing_route SET difficulty = TRIM(REGEXP_REPLACE(difficulty, '\\\\s+(PG13|PG-13|R|X)$', '')) WHERE difficulty REGEXP '(PG13|PG-13| R$| X$)'");
        $this->addSql("UPDATE climbing_route SET difficulty = TRIM(REGEXP_REPLACE(difficulty, '\\\\s+V[0-9]+-?[0-9]*$', '')) WHERE difficulty REGEXP 'V[0-9]'");

        // Step 3: Handle split grades (5.10a/b → 5.10a)
        $this->addSql("UPDATE climbing_route SET difficulty = SUBSTRING_INDEX(difficulty, '/', 1) WHERE difficulty LIKE '%/%'");

        // Step 4: Handle special grades
        $this->addSql("UPDATE climbing_route SET difficulty = 'III' WHERE difficulty = '3rd'");
        $this->addSql("UPDATE climbing_route SET difficulty = 'IV' WHERE difficulty = '4th'");
        $this->addSql("UPDATE climbing_route SET difficulty = 'V' WHERE difficulty LIKE 'Easy 5th%' OR difficulty = '5th'");

        // Step 5: Convert +/- modifier grades
        $this->addSql("UPDATE climbing_route SET difficulty = '5+' WHERE difficulty = '5.7+'");
        $this->addSql("UPDATE climbing_route SET difficulty = '5' WHERE difficulty = '5.8-'");
        $this->addSql("UPDATE climbing_route SET difficulty = '6a' WHERE difficulty = '5.8+'");
        $this->addSql("UPDATE climbing_route SET difficulty = '5+' WHERE difficulty = '5.9-'");
        $this->addSql("UPDATE climbing_route SET difficulty = '6a+' WHERE difficulty = '5.9+'");
        $this->addSql("UPDATE climbing_route SET difficulty = '6a+' WHERE difficulty = '5.10-'");
        $this->addSql("UPDATE climbing_route SET difficulty = '6c' WHERE difficulty = '5.10+'");
        $this->addSql("UPDATE climbing_route SET difficulty = '6c+' WHERE difficulty = '5.11-'");
        $this->addSql("UPDATE climbing_route SET difficulty = '7b' WHERE difficulty = '5.11+'");
        $this->addSql("UPDATE climbing_route SET difficulty = '7b+' WHERE difficulty = '5.12-'");
        $this->addSql("UPDATE climbing_route SET difficulty = '8a' WHERE difficulty = '5.12+'");
        $this->addSql("UPDATE climbing_route SET difficulty = '8a+' WHERE difficulty = '5.13-'");
        $this->addSql("UPDATE climbing_route SET difficulty = '8c' WHERE difficulty = '5.13+'");

        // Step 6: Convert bare grades (5.10, 5.11, etc.)
        $this->addSql("UPDATE climbing_route SET difficulty = '6a+' WHERE difficulty = '5.10'");
        $this->addSql("UPDATE climbing_route SET difficulty = '6c+' WHERE difficulty = '5.11'");
        $this->addSql("UPDATE climbing_route SET difficulty = '7b+' WHERE difficulty = '5.12'");
        $this->addSql("UPDATE climbing_route SET difficulty = '8a+' WHERE difficulty = '5.13'");
        $this->addSql("UPDATE climbing_route SET difficulty = '8c+' WHERE difficulty = '5.14'");

        // Step 7: Convert standard YDS grades
        $this->addSql("UPDATE climbing_route SET difficulty = '3' WHERE difficulty = '5.2'");
        $this->addSql("UPDATE climbing_route SET difficulty = '3+' WHERE difficulty = '5.3'");
        $this->addSql("UPDATE climbing_route SET difficulty = '4-' WHERE difficulty = '5.4'");
        $this->addSql("UPDATE climbing_route SET difficulty = '4' WHERE difficulty = '5.5'");
        $this->addSql("UPDATE climbing_route SET difficulty = '5-' WHERE difficulty = '5.6'");
        $this->addSql("UPDATE climbing_route SET difficulty = '5' WHERE difficulty = '5.7'");
        $this->addSql("UPDATE climbing_route SET difficulty = '5+' WHERE difficulty = '5.8'");
        $this->addSql("UPDATE climbing_route SET difficulty = '6a' WHERE difficulty = '5.9'");
        $this->addSql("UPDATE climbing_route SET difficulty = '6a+' WHERE difficulty = '5.10a'");
        $this->addSql("UPDATE climbing_route SET difficulty = '6b' WHERE difficulty = '5.10b'");
        $this->addSql("UPDATE climbing_route SET difficulty = '6b+' WHERE difficulty = '5.10c'");
        $this->addSql("UPDATE climbing_route SET difficulty = '6c' WHERE difficulty = '5.10d'");
        $this->addSql("UPDATE climbing_route SET difficulty = '6c+' WHERE difficulty = '5.11a'");
        $this->addSql("UPDATE climbing_route SET difficulty = '7a' WHERE difficulty = '5.11b'");
        $this->addSql("UPDATE climbing_route SET difficulty = '7a+' WHERE difficulty = '5.11c'");
        $this->addSql("UPDATE climbing_route SET difficulty = '7b' WHERE difficulty = '5.11d'");
        $this->addSql("UPDATE climbing_route SET difficulty = '7b+' WHERE difficulty = '5.12a'");
        $this->addSql("UPDATE climbing_route SET difficulty = '7c' WHERE difficulty = '5.12b'");
        $this->addSql("UPDATE climbing_route SET difficulty = '7c+' WHERE difficulty = '5.12c'");
        $this->addSql("UPDATE climbing_route SET difficulty = '8a' WHERE difficulty = '5.12d'");
        $this->addSql("UPDATE climbing_route SET difficulty = '8a+' WHERE difficulty = '5.13a'");
        $this->addSql("UPDATE climbing_route SET difficulty = '8b' WHERE difficulty = '5.13b'");
        $this->addSql("UPDATE climbing_route SET difficulty = '8b+' WHERE difficulty = '5.13c'");
        $this->addSql("UPDATE climbing_route SET difficulty = '8c' WHERE difficulty = '5.13d'");
        $this->addSql("UPDATE climbing_route SET difficulty = '8c+' WHERE difficulty = '5.14a'");
        $this->addSql("UPDATE climbing_route SET difficulty = '9a' WHERE difficulty = '5.14b'");
        $this->addSql("UPDATE climbing_route SET difficulty = '9a+' WHERE difficulty = '5.14c'");
        $this->addSql("UPDATE climbing_route SET difficulty = '9b+' WHERE difficulty = '5.15a'");
        $this->addSql("UPDATE climbing_route SET difficulty = '9c' WHERE difficulty = '5.15b'");
        $this->addSql("UPDATE climbing_route SET difficulty = '9c+' WHERE difficulty = '5.15c'");

        // Step 8: Populate difficulty_order
        $gradeOrder = [
            'III' => 1, 'IV' => 2, 'V' => 3,
            '3' => 4, '3+' => 5, '4-' => 6, '4' => 7, '4+' => 8,
            '5-' => 9, '5' => 10, '5+' => 11,
            '6a' => 12, '6a+' => 13, '6b' => 14, '6b+' => 15,
            '6c' => 16, '6c+' => 17, '7a' => 18, '7a+' => 19,
            '7b' => 20, '7b+' => 21, '7c' => 22, '7c+' => 23,
            '8a' => 24, '8a+' => 25, '8b' => 26, '8b+' => 27, '8c' => 28,
            '8c+' => 29, '9a' => 30, '9a+' => 31, '9b' => 32, '9b+' => 33, '9c' => 34, '9c+' => 35,
            'V0' => 40, 'V1' => 41, 'V2' => 42, 'V3' => 43, 'V4' => 44,
            'V5' => 45, 'V6' => 46, 'V7' => 47, 'V8' => 48, 'V9' => 49, 'V10' => 50,
        ];

        foreach ($gradeOrder as $grade => $order) {
            $this->addSql("UPDATE climbing_route SET difficulty_order = $order WHERE difficulty = '$grade'");
        }

        $this->addSql('CREATE INDEX idx_climbing_route_difficulty_order ON climbing_route (difficulty_order)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_climbing_route_difficulty_order ON climbing_route');
        $this->addSql('ALTER TABLE climbing_route DROP difficulty_order');
    }
}
