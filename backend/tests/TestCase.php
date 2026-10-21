<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Enforce strict SQLite :memory: isolation guard
        $connection = config('database.default');
        $database = config("database.connections.{$connection}.database");
        if ($connection !== 'sqlite' || $database !== ':memory:') {
            throw new RuntimeException("Safety Guard: Tests must run against isolated SQLite :memory: database, got '{$connection}' -> '{$database}'");
        }
    }
}
