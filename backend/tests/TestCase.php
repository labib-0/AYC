<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Enforce strict testing database isolation guard
        $connection = config('database.default');
        $database = (string) config("database.connections.{$connection}.database");
        $host = (string) config("database.connections.{$connection}.host");

        $isSafeSqlite = ($connection === 'sqlite' && $database === ':memory:');
        $isSafePgsql = (
            $connection === 'pgsql' &&
            in_array($database, ['ayaan_testing', 'ayaan_test', 'testing'], true) &&
            $host !== '200.97.169.230' &&
            $database !== 'ayaan_production'
        );

        if (!$isSafeSqlite && !$isSafePgsql) {
            throw new RuntimeException("Safety Guard: Tests must run against an isolated testing database (sqlite :memory: or isolated pgsql 'ayaan_testing'), got '{$connection}' -> '{$database}' on host '{$host}'");
        }
    }
}
