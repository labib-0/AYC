<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DevelopmentUserSeeder extends Seeder
{
    /**
     * Run the development user database seeds.
     * Roles: STRICTLY 'admin' and 'customer'.
     */
    public function run(): void
    {
        // 1. Primary Demo Super Administrator
        $adminAttributes = [
            'name' => 'Ayaan Super Admin',
            'password' => Hash::make('Admin@12345'),
            'role' => User::ROLE_ADMIN,
            'status' => 'active',
            'phone' => '+880 1826-304930',
            'company_name' => 'Ayaan Sourcing Ltd.',
            'email_verified_at' => now(),
            'is_demo' => true,
            'is_super_admin' => true,
        ];
        $superAdmin = User::withTrashed()->where('email', 'admin@ayaan-demo.local')->first();
        if ($superAdmin) {
            if ($superAdmin->trashed()) {
                $superAdmin->restore();
            }
            $superAdmin->update($adminAttributes);
        } else {
            $superAdmin = User::create(array_merge(['email' => 'admin@ayaan-demo.local'], $adminAttributes));
        }

        // 1b. Scoped Local Test Administrators with granular RBAC roles
        $scopedAdmins = [
            [
                'email' => 'product-admin@ayaan-demo.local',
                'name' => 'Product Draft Administrator',
                'role_slug' => 'product_draft_editor',
            ],
            [
                'email' => 'payment-reviewer@ayaan-demo.local',
                'name' => 'Payment Reviewer Admin',
                'role_slug' => 'payment_reviewer',
            ],
            [
                'email' => 'inventory-viewer@ayaan-demo.local',
                'name' => 'Inventory Viewer Admin',
                'role_slug' => 'inventory_viewer',
            ],
            [
                'email' => 'order-viewer@ayaan-demo.local',
                'name' => 'Order Viewer Admin',
                'role_slug' => 'order_viewer',
            ],
            [
                'email' => 'analytics-viewer@ayaan-demo.local',
                'name' => 'Sales Analytics Viewer Admin',
                'role_slug' => 'sales_viewer',
            ],
        ];

        $authz = app(\App\Services\Rbac\AdminAuthorizationService::class);

        foreach ($scopedAdmins as $sAdmin) {
            $userAttrs = [
                'name' => $sAdmin['name'],
                'password' => Hash::make('Admin@12345'),
                'role' => User::ROLE_ADMIN,
                'status' => 'active',
                'phone' => '+880 1826-304930',
                'company_name' => 'Ayaan Sourcing Ltd.',
                'email_verified_at' => now(),
                'is_demo' => true,
                'is_super_admin' => false,
            ];

            $user = User::withTrashed()->where('email', $sAdmin['email'])->first();
            if ($user) {
                if ($user->trashed()) {
                    $user->restore();
                }
                $user->update($userAttrs);
            } else {
                $user = User::create(array_merge(['email' => $sAdmin['email']], $userAttrs));
            }

            $role = \App\Models\Role::where('slug', $sAdmin['role_slug'])->first();
            if ($role) {
                $user->rbacRoles()->syncWithoutDetaching([
                    $role->id => [
                        'assigned_by' => $superAdmin->id,
                        'assigned_at' => now(),
                    ],
                ]);
            }

            $authz->invalidateUser($user);
        }

        // 2. Verified Demo B2B Wholesale Customers (5–10 accounts)
        $customers = [
            [
                'name' => 'Elena Rostova',
                'email' => 'customer@ayaan-demo.local',
                'password' => 'Customer@12345',
                'phone' => '+1 (555) 392-8172',
                'company_name' => 'Rostova Retail Boutique LLC',
                'tax_id' => 'US-EIN-9920194',
                'b2b_approval_status' => 'approved',
                'b2b_payment_terms' => 'net_30',
            ],
            [
                'name' => 'Tariq Al-Mansoor',
                'email' => 'buyer@ayaan-demo.local',
                'password' => 'Customer@12345',
                'phone' => '+971 50 123 4567',
                'company_name' => 'Gulf Apparel & Luxury LLC',
                'tax_id' => 'AE-TRN-984710',
                'b2b_approval_status' => 'approved',
                'b2b_payment_terms' => 'net_30',
            ],
            [
                'name' => 'Sophie Martin',
                'email' => 'sophie@ayaan-demo.local',
                'password' => 'Customer@12345',
                'phone' => '+33 1 42 68 55 00',
                'company_name' => 'Paris Mode Diffusion SAS',
                'tax_id' => 'FR-TVA-5582910',
                'b2b_approval_status' => 'approved',
                'b2b_payment_terms' => 'net_60',
            ],
            [
                'name' => 'Marcus Vance',
                'email' => 'marcus@ayaan-demo.local',
                'password' => 'Customer@12345',
                'phone' => '+47 22 83 90 00',
                'company_name' => 'Nordic Trendsetters AS',
                'tax_id' => 'NO-MVA-9281720',
                'b2b_approval_status' => 'approved',
                'b2b_payment_terms' => 'net_30',
            ],
            [
                'name' => 'Kenji Sato',
                'email' => 'kenji@ayaan-demo.local',
                'password' => 'Customer@12345',
                'phone' => '+81 3 5555 0143',
                'company_name' => 'Tokyo Wholesale Garments Co.',
                'tax_id' => 'JP-HOJIN-8472910',
                'b2b_approval_status' => 'approved',
                'b2b_payment_terms' => 'none',
            ],
            [
                'name' => 'Liam O\'Connor',
                'email' => 'liam@ayaan-demo.local',
                'password' => 'Customer@12345',
                'phone' => '+353 1 496 0000',
                'company_name' => 'Dublin Apparel Exchange Ltd.',
                'tax_id' => 'IE-VAT-8291048',
                'b2b_approval_status' => 'pending',
                'b2b_payment_terms' => 'none',
            ],
            [
                'name' => 'Alessandro Moretti',
                'email' => 'alessandro@ayaan-demo.local',
                'password' => 'Customer@12345',
                'phone' => '+39 02 8765 4321',
                'company_name' => 'Milano Tessuti Srl',
                'tax_id' => 'IT-PIVA-0987654',
                'b2b_approval_status' => 'rejected',
                'b2b_payment_terms' => 'none',
            ],
        ];

        foreach ($customers as $data) {
            $customerAttrs = [
                'name' => $data['name'],
                'password' => Hash::make($data['password']),
                'role' => User::ROLE_CUSTOMER,
                'phone' => $data['phone'],
                'company_name' => $data['company_name'],
                'tax_id' => $data['tax_id'],
                'b2b_approval_status' => $data['b2b_approval_status'],
                'b2b_payment_terms' => $data['b2b_payment_terms'],
                'email_verified_at' => now(),
                'is_demo' => true,
            ];
            $customer = User::withTrashed()->where('email', $data['email'])->first();
            if ($customer) {
                if ($customer->trashed()) {
                    $customer->restore();
                }
                $customer->update($customerAttrs);
            } else {
                User::create(array_merge(['email' => $data['email']], $customerAttrs));
            }
        }
    }
}
