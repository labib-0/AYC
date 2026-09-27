import { User } from "@/types/api";

export interface MockUserData extends User {
  password: string;
  is_active?: boolean;
}

export const INITIAL_MOCK_USERS: MockUserData[] = [
  // 1. Production Demo Admin
  {
    id: 54,
    name: "Ayaan Demo Admin",
    email: "admin@ayaan-demo.local",
    password: "Admin@12345",
    role: "admin",
    phone: "+880 1982-183886",
    company_name: "Ayaan Sourcing Ltd.",
    tax_id: "BD-DEMO-ADMIN",
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    b2b_approval_status: "approved",
    b2b_payment_terms: "net_60",
    created_at: "2026-09-22T00:00:00Z",
  },
  // 2. Production Demo Customer (Strictly Customer Role with full B2B Wholesale capabilities)
  {
    id: 55,
    name: "Demo Customer",
    email: "customer@ayaan-demo.local",
    password: "Customer@12345",
    role: "customer",
    phone: "+880 1982-183886",
    company_name: "Ayaan Commercial Demo Corp",
    tax_id: "US-DEMO-99901",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    b2b_approval_status: "approved",
    b2b_payment_terms: "net_30",
    created_at: "2026-09-22T00:00:00Z",
  },
];
