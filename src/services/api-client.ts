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
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  token?: string;
}

class ApiClient {
  private baseUrl: string;
  private tokenKey = "ayaan_auth_token";

  constructor() {
    // API base URL — currently unused in frontend-only mode
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    // Strip trailing slash if present
    if (this.baseUrl.endsWith("/")) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.tokenKey);
  }

  public setToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.tokenKey, token);
  }

  public removeToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.tokenKey);
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
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`);

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
    const { params, body, headers, token, ...customConfig } = options;

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

    try {
      const url = this.buildUrl(path, params);
      const response = await fetch(url, config);

      let responseData: any = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json().catch(() => null);
      } else {
        responseData = await response.text().catch(() => null);
      }

      if (!response.ok) {
        // Standard validation error handling (422)
        if (response.status === 422 && responseData?.errors) {
          const validation = responseData as ApiValidationError;
          throw new ApiError(
            response.status,
            validation.message || "The given data was invalid.",
            validation.errors,
            responseData
          );
        }

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
      throw new ApiError(0, err?.message || "Network error or server unreachable");
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
