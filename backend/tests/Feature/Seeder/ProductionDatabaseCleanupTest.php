<?php

namespace Tests\Feature\Seeder;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Quote;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProductionDatabaseCleanupTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test production DatabaseSeeder strictly seeds 1 Admin and 1 Customer.
     */
    public function test_database_seeder_seeds_strictly_two_users_and_is_idempotent(): void
    {
        // First run
        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseCount('users', 2);
        $this->assertDatabaseCount('products', 0);
        $this->assertDatabaseCount('categories', 0);
        $this->assertDatabaseCount('brands', 0);
        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('quotes', 0);

        $admin = User::where('email', 'admin@ayaan-demo.local')->first();
        $this->assertNotNull($admin);
        $this->assertEquals(User::ROLE_ADMIN, $admin->role);
        $this->assertTrue(Hash::check('Admin@12345', $admin->password));

        $customer = User::where('email', 'customer@ayaan-demo.local')->first();
        $this->assertNotNull($customer);
        $this->assertEquals(User::ROLE_CUSTOMER, $customer->role);
        $this->assertTrue(Hash::check('Customer@12345', $customer->password));
        $this->assertEquals('approved', $customer->b2b_approval_status);

        // Second run must be idempotent without creating duplicate accounts
        $this->seed(DatabaseSeeder::class);
        $this->assertDatabaseCount('users', 2);
    }

    /**
     * Test db:production-cleanup console command purges demo data and preserves strictly the two accounts.
     */
    public function test_production_cleanup_command_executes_successfully(): void
    {
        // Populate dummy demo data
        $brand = Brand::create(['name' => 'Test Demo Brand', 'slug' => 'test-demo-brand', 'is_active' => true]);
        $category = Category::create(['name' => 'Test Demo Cat', 'slug' => 'test-demo-cat', 'is_active' => true]);
        Product::create([
            'brand_id' => $brand->id,
            'name' => 'Demo Shirt',
            'slug' => 'demo-shirt',
            'sku' => 'DEMO-001',
            'wholesale_price' => 20.00,
            'msrp_price' => 40.00,
            'cost_price' => 10.00,
            'moq' => 10,
            'is_active' => true,
        ]);
        User::create([
            'name' => 'Extra User',
            'email' => 'extra@example.com',
            'password' => Hash::make('password'),
            'role' => User::ROLE_CUSTOMER,
        ]);

        $this->assertGreaterThan(0, Product::count());
        $this->assertGreaterThanOrEqual(1, User::count());

        // Run cleanup command
        $this->artisan('db:production-cleanup', ['--force' => true])
            ->assertExitCode(0);

        $this->assertDatabaseCount('users', 2);
        $this->assertDatabaseCount('products', 0);
        $this->assertDatabaseCount('categories', 0);
        $this->assertDatabaseCount('brands', 0);
        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('quotes', 0);

        $admin = User::where('email', 'admin@ayaan-demo.local')->first();
        $this->assertNotNull($admin);
        $this->assertEquals(User::ROLE_ADMIN, $admin->role);

        $customer = User::where('email', 'customer@ayaan-demo.local')->first();
        $this->assertNotNull($customer);
        $this->assertEquals(User::ROLE_CUSTOMER, $customer->role);
    }
}
