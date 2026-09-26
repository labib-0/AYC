import { ApiValidationError } from "@/types/api";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  data?: unknown;

  constructor(status: number, message: string, errors?: Record<string, string[]>, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.data = data;
  }

  get isAuthError(): boolean {
    return this.status === 401;
  }

  get isForbiddenError(): boolean {
    return this.status === 403;
  }

  get isNotFoundError(): boolean {
    return this.status === 404;
  }

  get isValidationError(): boolean {
    return this.status === 422;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isServerError(): boolean {
    return this.status >= 500 && this.status <= 599;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  token?: string;
  _retryCount?: number;
}

class ApiClient {
  private baseUrl: string;
  private tokenKey = "ayaan_auth_token";

  constructor() {
    let url = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
    if (url.endsWith("/")) {
      url = url.slice(0, -1);
    }
    if (!url.includes("/api/v1") && !url.includes("/api")) {
      url = `${url}/api/v1`;
    }
    this.baseUrl = url;
  }

  public getBaseUrl(): string {
    if (typeof window !== "undefined") {
      if (window.location.hostname === "localhost" && this.baseUrl.includes("127.0.0.1")) {
        return this.baseUrl.replace("127.0.0.1", "localhost");
      }
      if (window.location.hostname === "127.0.0.1" && this.baseUrl.includes("localhost")) {
        return this.baseUrl.replace("localhost", "127.0.0.1");
      }
    }
    return this.baseUrl;
  }

  public isAdminContext(): boolean {
    if (typeof window === "undefined") return false;
    return (
      window.location.port === "3001" ||
      window.location.pathname.startsWith("/admin") ||
      window.location.hostname.startsWith("admin.")
    );
  }

  public getToken(): string | null {
    if (typeof window === "undefined") return null;

    const isAdmin = this.isAdminContext();
    const adminToken = localStorage.getItem("ayaan_admin_token");
    const customerToken = localStorage.getItem(this.tokenKey);

    // In fullstack mode, mock-generated tokens fail against Laravel Sanctum
    const sanitizeToken = (t: string | null): string | null => {
      if (!t) return null;
      if (t.startsWith("mock_token_") || t.startsWith("admin_token_usr_")) {
        const isFrontend = localStorage.getItem("ayaan_frontend_only_mode") === "true";
        if (!isFrontend) return null;
      }
      return t;
    };

    if (isAdmin) {
      const cleanAdmin = sanitizeToken(adminToken);
      if (cleanAdmin) return cleanAdmin;
      return sanitizeToken(customerToken);
    }

    const cleanCustomer = sanitizeToken(customerToken);
    if (cleanCustomer) return cleanCustomer;
    return sanitizeToken(adminToken);
  }

  public setToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.tokenKey, token);
    if (this.isAdminContext()) {
      localStorage.setItem("ayaan_admin_token", token);
    }
  }

  public setAdminToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("ayaan_admin_token", token);
    localStorage.setItem(this.tokenKey, token);
  }

  public removeToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem("ayaan_admin_token");
  }

  public getSessionId(): string {
    if (typeof window === "undefined") return "";
    let sessionId = localStorage.getItem("ayaan_session_id");
    if (!sessionId) {
      sessionId = "sess_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem("ayaan_session_id", sessionId);
    }
    return sessionId;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>): string {
    let cleanPath = path.startsWith("/") ? path : `/${path}`;
    const base = this.getBaseUrl();
    if (base.endsWith("/api/v1") && cleanPath.startsWith("/api/v1")) {
      cleanPath = cleanPath.slice(7);
      if (!cleanPath.startsWith("/")) cleanPath = `/${cleanPath}`;
    }
    const url = new URL(`${base}${cleanPath}`);

    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          url.searchParams.append(key, String(val));
        }
      });
    }

    return url.toString();
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, body, headers, token, _retryCount = 0, ...customConfig } = options;

    const activeToken = token || this.getToken();
    const sessionId = this.getSessionId();

    const requestHeaders: HeadersInit = {
      "Accept": "application/json",
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(activeToken ? { "Authorization": `Bearer ${activeToken}` } : {}),
      ...(sessionId ? { "X-Session-Id": sessionId } : {}),
      ...headers,
    };

    const config: RequestInit = {
      ...customConfig,
      headers: requestHeaders,
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    };

    let url = "";
    try {
      url = this.buildUrl(path, params);
      const response = await fetch(url, config);

      let responseData: any = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json().catch(() => null);
      } else {
        responseData = await response.text().catch(() => null);
      }

      if (!response.ok) {
        // 1. Handle 401 Unauthorized with safe, bounded recovery
        if (response.status === 401) {
          // If we had a token and this is the first attempt, try to revalidate once
          const isAuthPath = path.includes("/auth/login") || path.includes("/auth/register");
          if (!isAuthPath && activeToken && _retryCount === 0) {
            // Re-fetch token once in case it was refreshed in another tab/context
            const freshToken = this.getToken();
            if (freshToken && freshToken !== activeToken) {
              return this.request<T>(path, { ...options, _retryCount: 1, token: freshToken });
            }
          }

          // If genuinely unauthenticated after checked retry, notify session expiration
          if (!isAuthPath && typeof window !== "undefined") {
            const currentPath = window.location.pathname + window.location.search;
            if (!currentPath.includes("/login")) {
              sessionStorage.setItem("ayaan_intended_destination", currentPath);
              sessionStorage.setItem(
                "ayaan_session_expired_message",
                "Your session has expired. Please sign in again to continue."
              );
            }
            window.dispatchEvent(
              new CustomEvent("ayaan:session_expired", {
                detail: { path: currentPath, status: 401 },
              })
            );
          }

          throw new ApiError(
            401,
            responseData?.message || "Your session has expired or authentication is invalid. Please sign in.",
            undefined,
            responseData
          );
        }

        // 2. Standard validation error handling (422)
        if (response.status === 422 && responseData?.errors) {
          const validation = responseData as ApiValidationError;
          throw new ApiError(
            response.status,
            validation.message || "The given data was invalid.",
            validation.errors,
            responseData
          );
        }

        // 3. HARD RULE: Normal errors (403, 404, 429, 500, 502, 503, 504) MUST NOT clear session!
        const errorMessage =
          responseData?.message ||
          responseData?.error ||
          `Request failed with status ${response.status} (${response.statusText})`;

        throw new ApiError(response.status, errorMessage, undefined, responseData);
      }

      return responseData as T;
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }
      const isDev = process.env.NODE_ENV !== "production";
      const method = (config.method || "GET").toUpperCase();
      const diagnostic = isDev
        ? `Backend unreachable or network failure (${method} ${url || path}): ${err?.message || "Check Laravel server on port 8000"}`
        : "Network error or server unreachable. Please check your connection.";
      throw new ApiError(0, diagnostic, undefined, { originalError: err?.message, url, method });
    }
  }

  public get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  public post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  public put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "PUT", body });
  }

  public patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "PATCH", body });
  }

  public delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
