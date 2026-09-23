/**
 * Standard API Response Wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

/**
 * Paginated API Response Wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}

/**
 * Standard 422 Unprocessable Entity Validation Error
 */
export interface ApiValidationError {
  message: string;
  errors: Record<string, string[]>;
}

/**
 * Generic API Error representation
 */
export interface ApiErrorDetail {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

/**
 * Auth Tokens & Credentials
 */
export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * User Entity
 */
export interface User {
  id: string | number;
  name: string;
  email: string;
  role?: "customer" | "admin" | "sales";
  phone?: string;
  company_name?: string;
  tax_id?: string;
  country?: string;
  business_type?: string;
  website?: string;
  b2b_approval_status?: "pending" | "approved" | "rejected";
  b2b_payment_terms?: "none" | "net_30" | "net_60" | "terms";
  b2b_credit_limit?: number;
  avatar_url?: string;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}


export interface UserProfile extends User {
  addresses?: UserAddress[];
}

export interface UserAddress {
  id: string | number;
  user_id: string | number;
  label?: string;
  name: string;
  contact_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country_code: string;
  country?: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}
