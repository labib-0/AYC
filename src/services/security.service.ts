import { apiClient } from "./api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";

export type SecurityAction =
  | "signup"
  | "admin-login"
  | "forgot-password"
  | "rfq-create"
  | "order-checkout";

export interface FormSecurityTokenResponse {
  token: string;
  action: string;
  issued_at: number;
  expires_in: number;
}

class SecurityService {
  /**
   * Fetches a short-lived, signed action-bound form security token from the backend.
   * If in frontend-only mock mode or if network is unavailable, resolves to null gracefully.
   */
  async getFormToken(action: SecurityAction): Promise<string | null> {
    if (isFrontendOnly()) {
      return null;
    }

    try {
      const res = await apiClient.get<any>("/security/form-token", {
        params: { action },
      });
      const data = res?.data || res;
      return data?.token || null;
    } catch (err) {
      console.warn(`[SecurityService] Form token request for action '${action}' failed:`, err);
      return null;
    }
  }
}

export const securityService = new SecurityService();
