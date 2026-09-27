<?php

namespace Tests\Feature\Admin;

use App\Models\Order;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderDateFilterTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected string $tz;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tz = config('business.timezone', 'Asia/Dhaka');

        $this->admin = User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'admin@ayaan.com',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);
    }

    private function createOrderForDate(Carbon $carbonDate, array $overrides = []): Order
    {
        $utc = $carbonDate->copy()->setTimezone('UTC');
        return Order::factory()->create(array_merge([
            'created_at' => $utc,
            'updated_at' => $utc,
            'placed_at' => $utc,
        ], $overrides));
    }

    public function test_all_dates_returns_all_orders(): void
    {
        $now = Carbon::now($this->tz);
        $this->createOrderForDate($now);
        $this->createOrderForDate($now->copy()->subDays(5));
        $this->createOrderForDate($now->copy()->subDays(45));

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/orders?date_preset=all')
            ->assertStatus(200);

        $this->assertCount(3, $res->json('data.data'));
    }

    public function test_filter_preset_today(): void
    {
        $now = Carbon::now($this->tz);
        // Today order (in Asia/Dhaka)
        $todayOrder = $this->createOrderForDate($now->copy()->startOfDay()->addHours(2), ['order_number' => 'ORD-TODAY']);
        // Yesterday order (in Asia/Dhaka)
        $this->createOrderForDate($now->copy()->subDay()->startOfDay()->addHours(12), ['order_number' => 'ORD-YESTERDAY']);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/orders?date_preset=today')
            ->assertStatus(200);

        $items = $res->json('data.data');
        $this->assertCount(1, $items);
        $this->assertEquals('ORD-TODAY', $items[0]['order_number']);
    }

    public function test_filter_preset_yesterday(): void
    {
        $now = Carbon::now($this->tz);
        $this->createOrderForDate($now->copy()->startOfDay()->addHours(4), ['order_number' => 'ORD-TODAY']);
        $yesterdayOrder = $this->createOrderForDate($now->copy()->subDay()->startOfDay()->addHours(10), ['order_number' => 'ORD-YESTERDAY']);
        $this->createOrderForDate($now->copy()->subDays(3), ['order_number' => 'ORD-OLDER']);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/orders?date_preset=yesterday')
            ->assertStatus(200);

        $items = $res->json('data.data');
        $this->assertCount(1, $items);
        $this->assertEquals('ORD-YESTERDAY', $items[0]['order_number']);
    }

    public function test_filter_preset_last_7_days(): void
    {
        $now = Carbon::now($this->tz);
        $this->createOrderForDate($now, ['order_number' => 'ORD-DAY-0']);
        $this->createOrderForDate($now->copy()->subDays(3), ['order_number' => 'ORD-DAY-3']);
        $this->createOrderForDate($now->copy()->subDays(6), ['order_number' => 'ORD-DAY-6']);
        $this->createOrderForDate($now->copy()->subDays(10), ['order_number' => 'ORD-DAY-10']);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/orders?date_preset=last_7_days')
            ->assertStatus(200);

        $items = $res->json('data.data');
        $this->assertCount(3, $items);
        $orderNumbers = collect($items)->pluck('order_number')->all();
        $this->assertContains('ORD-DAY-0', $orderNumbers);
        $this->assertContains('ORD-DAY-3', $orderNumbers);
        $this->assertContains('ORD-DAY-6', $orderNumbers);
        $this->assertNotContains('ORD-DAY-10', $orderNumbers);
    }

    public function test_filter_preset_last_30_days(): void
    {
        $now = Carbon::now($this->tz);
        $this->createOrderForDate($now, ['order_number' => 'ORD-RECENT']);
        $this->createOrderForDate($now->copy()->subDays(20), ['order_number' => 'ORD-20-DAYS']);
        $this->createOrderForDate($now->copy()->subDays(40), ['order_number' => 'ORD-40-DAYS']);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/orders?date_preset=last_30_days')
            ->assertStatus(200);

        $items = $res->json('data.data');
        $this->assertCount(2, $items);
        $orderNumbers = collect($items)->pluck('order_number')->all();
        $this->assertContains('ORD-RECENT', $orderNumbers);
        $this->assertContains('ORD-20-DAYS', $orderNumbers);
        $this->assertNotContains('ORD-40-DAYS', $orderNumbers);
    }

    public function test_filter_preset_this_month_and_last_month(): void
    {
        $now = Carbon::now($this->tz);
        $this->createOrderForDate($now->copy()->startOfMonth()->addDays(1), ['order_number' => 'ORD-THIS-MONTH']);
        $this->createOrderForDate($now->copy()->subMonthNoOverflow()->startOfMonth()->addDays(2), ['order_number' => 'ORD-LAST-MONTH']);
        $this->createOrderForDate($now->copy()->subMonths(3), ['order_number' => 'ORD-3-MONTHS-AGO']);

        // Test this_month
        $resThis = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/orders?date_preset=this_month')
            ->assertStatus(200);

        $itemsThis = $resThis->json('data.data');
        $this->assertCount(1, $itemsThis);
        $this->assertEquals('ORD-THIS-MONTH', $itemsThis[0]['order_number']);

        // Test last_month
        $resLast = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/orders?date_preset=last_month')
            ->assertStatus(200);

        $itemsLast = $resLast->json('data.data');
        $this->assertCount(1, $itemsLast);
        $this->assertEquals('ORD-LAST-MONTH', $itemsLast[0]['order_number']);
    }

    public function test_filter_custom_range_inclusive(): void
    {
        $date1 = Carbon::parse('2026-05-10 10:00:00', $this->tz);
        $date2 = Carbon::parse('2026-05-15 15:30:00', $this->tz);
        $date3 = Carbon::parse('2026-05-20 08:00:00', $this->tz);

        $this->createOrderForDate($date1, ['order_number' => 'ORD-MAY-10']);
        $this->createOrderForDate($date2, ['order_number' => 'ORD-MAY-15']);
        $this->createOrderForDate($date3, ['order_number' => 'ORD-MAY-20']);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/orders?date_from=2026-05-10&date_to=2026-05-15')
            ->assertStatus(200);

        $items = $res->json('data.data');
        $this->assertCount(2, $items);
        $orderNumbers = collect($items)->pluck('order_number')->all();
        $this->assertContains('ORD-MAY-10', $orderNumbers);
        $this->assertContains('ORD-MAY-15', $orderNumbers);
        $this->assertNotContains('ORD-MAY-20', $orderNumbers);
    }

    public function test_invalid_custom_range_returns_422(): void
    {
        // date_from > date_to must fail server-side validation
        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/orders?date_from=2026-05-20&date_to=2026-05-10')
            ->assertStatus(422);

        $this->assertFalse($res->json('success'));
        $this->assertArrayHasKey('date_to', $res->json('errors'));
    }

    public function test_invalid_date_preset_returns_422(): void
    {
        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/orders?date_preset=invalid_choice')
            ->assertStatus(422);

        $this->assertFalse($res->json('success'));
        $this->assertArrayHasKey('date_preset', $res->json('errors'));
    }

    public function test_date_filter_combined_with_search_and_statuses(): void
    {
        $now = Carbon::now($this->tz);

        $this->createOrderForDate($now, [
            'order_number' => 'ORD-MATCH-100',
            'shipping_name' => 'Alice Walker',
            'status' => 'processing',
            'payment_status' => 'paid',
            'fulfillment_status' => 'partial',
        ]);

        $this->createOrderForDate($now, [
            'order_number' => 'ORD-DIFF-STATUS',
            'shipping_name' => 'Alice Walker',
            'status' => 'cancelled',
            'payment_status' => 'paid',
            'fulfillment_status' => 'partial',
        ]);

        $this->createOrderForDate($now->copy()->subDays(10), [
            'order_number' => 'ORD-OLD-MATCH',
            'shipping_name' => 'Alice Walker',
            'status' => 'processing',
            'payment_status' => 'paid',
            'fulfillment_status' => 'partial',
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/orders?date_preset=today&search=Alice&status=processing&payment_status=paid&fulfillment_status=partial')
            ->assertStatus(200);

        $items = $res->json('data.data');
        $this->assertCount(1, $items);
        $this->assertEquals('ORD-MATCH-100', $items[0]['order_number']);
    }

    public function test_date_filter_with_pagination(): void
    {
        $now = Carbon::now($this->tz);

        for ($i = 1; $i <= 5; $i++) {
            $this->createOrderForDate($now, ['order_number' => "ORD-PG-{$i}"]);
        }
        $this->createOrderForDate($now->copy()->subDays(15), ['order_number' => 'ORD-OLD']);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/orders?date_preset=today&per_page=2&page=1')
            ->assertStatus(200);

        $this->assertCount(2, $res->json('data.data'));
        $this->assertEquals(5, $res->json('data.total'));
        $this->assertEquals(3, $res->json('data.last_page'));
    }
}
