<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Consolidate role system to two roles only: 'customer' and 'admin'.
     * Safely migrates all existing 'b2b_buyer' accounts to 'customer' without data loss.
     */
    public function up(): void
    {
        // 1. Convert any legacy 'b2b_buyer' (or other non-admin) roles to 'customer'
        DB::table('users')
            ->whereNotIn('role', ['customer', 'admin'])
            ->update(['role' => 'customer']);

        // 2. For PostgreSQL, add a check constraint enforcing only 'customer' and 'admin'
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'admin'))");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        }
    }
};
