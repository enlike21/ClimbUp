<?php

namespace App\Service;

class GradeConversionService
{
    private const YDS_TO_FRENCH = [
        '5.2' => '3', '5.3' => '3+', '5.4' => '4-', '5.5' => '4',
        '5.6' => '5-', '5.7' => '5', '5.8' => '5+', '5.9' => '6a',
        '5.10a' => '6a+', '5.10b' => '6b', '5.10c' => '6b+', '5.10d' => '6c',
        '5.11a' => '6c+', '5.11b' => '7a', '5.11c' => '7a+', '5.11d' => '7b',
        '5.12a' => '7b+', '5.12b' => '7c', '5.12c' => '7c+', '5.12d' => '8a',
        '5.13a' => '8a+', '5.13b' => '8b', '5.13c' => '8b+', '5.13d' => '8c',
        '5.14a' => '8c+', '5.14b' => '9a', '5.14c' => '9a+', '5.14d' => '9b',
        '5.15a' => '9b+', '5.15b' => '9c', '5.15c' => '9c+',
    ];

    // Bare grades without letter suffix → map to "a" subgrade
    private const YDS_BARE = [
        '5.10' => '6a+', '5.11' => '6c+', '5.12' => '7b+',
        '5.13' => '8a+', '5.14' => '8c+', '5.15' => '9b+',
    ];

    // +/- modifiers for grades
    private const YDS_MODIFIERS = [
        '5.7+' => '5+', '5.8-' => '5', '5.8+' => '6a',
        '5.9-' => '5+', '5.9+' => '6a+',
        '5.10-' => '6a+', '5.10+' => '6c',
        '5.11-' => '6c+', '5.11+' => '7b',
        '5.12-' => '7b+', '5.12+' => '8a',
        '5.13-' => '8a+', '5.13+' => '8c',
        '5.14' => '8c+',
    ];

    public const GRADE_ORDER = [
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

    public function convert(string $grade): string
    {
        $grade = trim($grade);

        // Already French or V-scale? Return as-is
        if (preg_match('/^[3-9][a-c]?\+?$/', $grade) || preg_match('/^V\d+$/', $grade)) {
            return $grade;
        }

        // Strip aid grades (A0, A1, A2, C0, C0-1, etc.)
        $grade = preg_replace('/\s+[AC]\d[\+\-]?(?:[\-\/]\d)?/i', '', $grade);

        // Strip risk modifiers
        $grade = preg_replace('/\s*(PG13|PG-13|R|X)\s*$/i', '', $grade);

        // Strip V-scale suffixes on sport grades (e.g., "5.9+ V4")
        $grade = preg_replace('/\s+V\d+[\-]?\d*/i', '', $grade);

        $grade = trim($grade);

        // Handle "Easy 5th" and class grades
        if (preg_match('/easy\s+5th/i', $grade)) {
            return 'V';
        }
        if ('3rd' === $grade) {
            return 'III';
        }
        if ('4th' === $grade) {
            return 'IV';
        }
        if ('5th' === $grade) {
            return 'V';
        }

        // Handle split grades (5.10a/b) — take first
        if (preg_match('/^(5\.\d+[a-d]?)\//', $grade, $m)) {
            $grade = $m[1];
        }

        // Direct lookup
        if (isset(self::YDS_TO_FRENCH[$grade])) {
            return self::YDS_TO_FRENCH[$grade];
        }

        // +/- modifiers
        if (isset(self::YDS_MODIFIERS[$grade])) {
            return self::YDS_MODIFIERS[$grade];
        }

        // Bare grades (5.10, 5.11, etc.)
        if (isset(self::YDS_BARE[$grade])) {
            return self::YDS_BARE[$grade];
        }

        // Fallback: return original
        return $grade;
    }

    public function getOrder(string $frenchGrade): ?int
    {
        return self::GRADE_ORDER[$frenchGrade] ?? null;
    }
}
