import { apiClient } from "@/services/api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";
import { isValidImageUrl, normalizeImageUrl } from "@/lib/media";

export interface UploadResult {
  url: string;
  key: string;
  error?: any;
}

/**
 * Upload a product image via REST API.
 *
 * In fullstack mode (NEXT_PUBLIC_FRONTEND_ONLY=false):
 *   POST /api/v1/upload → Laravel stores file in public/storage/products/ → returns URL
 *   If the API call fails, the error is thrown so the admin sees it (NOT silently base64-encoded).
 *
 * In frontend-only / demo mode:
 *   Falls back to a local Data URL for temporary in-browser preview only.
 *   The Data URL is NEVER sent to a real database column.
 */
export async function uploadProductImage(file: File): Promise<UploadResult> {
  const frontendOnly = isFrontendOnly();

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "products");

    const res = await apiClient.post<any>("/upload", formData);
    const rawUrl = res?.url || res?.data?.url;
    const key = res?.key || res?.data?.key || res?.path || file.name;
    if (rawUrl && isValidImageUrl(rawUrl)) {
      return { url: normalizeImageUrl(rawUrl), key };
    }
    throw new Error(res?.message || "Upload succeeded but server returned an invalid or incomplete storage URL.");
  } catch (err: any) {
    if (!frontendOnly) {
      // In fullstack mode, always surface the real error so the admin knows the upload failed.
      // Do NOT silently convert to base64 — base64 data URIs exceed varchar(500) and will corrupt the DB.
      const msg =
        err?.message ||
        "Image upload failed. Please check your connection and try again.";
      throw new Error(msg);
    }

    // Frontend-only / demo mode only: use local Data URL for in-browser preview.
    // This Data URL is never sent to a real PostgreSQL product_images.image_url column.
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          key: `local_${Date.now()}_${file.name}`,
        });
      };
      reader.onerror = () => {
        const localUrl =
          typeof window !== "undefined"
            ? URL.createObjectURL(file)
            : "/placeholder.jpg";
        resolve({
          url: localUrl,
          key: `local_${Date.now()}_${file.name}`,
        });
      };
      reader.readAsDataURL(file);
    });
  }
}


/**
 * Upload a brand logo via REST API or persistent base64 Data URL
 * Conforms to Rules 2, 4, 25: Validates image file type, supports PNG,
 * and ensures persistent logo storage in mock/frontend mode.
 */
export async function uploadBrandLogo(file: File): Promise<UploadResult> {
  const validTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"];
  const isImage = validTypes.includes(file.type) || file.type.startsWith("image/");

  if (!isImage) {
    throw new Error("Invalid file format. Please upload a valid image file (PNG preferred).");
  }

  // Attempt REST API upload if available
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "brands");

    const res = await apiClient.post<any>("/upload", formData);
    const rawUrl = res?.url || res?.data?.url;
    if (rawUrl && isValidImageUrl(rawUrl)) {
      return {
        url: normalizeImageUrl(rawUrl),
        key: res.key || res.data?.key || file.name,
      };
    }
  } catch {
    // Graceful fallback for offline / frontend mode
  }

  // In offline / mock mode, convert to persistent base64 Data URL so it saves to localStorage
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({
        url: dataUrl,
        key: `logo_${Date.now()}_${file.name}`,
      });
    };
    reader.onerror = () => {
      // Fallback to object URL if file reader fails
      const fallbackUrl = typeof window !== "undefined" ? URL.createObjectURL(file) : "";
      resolve({
        url: fallbackUrl,
        key: `logo_${Date.now()}_${file.name}`,
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a category image via REST API or persistent base64 Data URL
 */
export async function uploadCategoryImage(file: File): Promise<UploadResult> {
  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
  const isImage = validTypes.includes(file.type) || file.type.startsWith("image/");

  if (!isImage) {
    throw new Error("Invalid file format. Please upload a valid image file (SVG, PNG, JPG, or WebP).");
  }

  // Attempt REST API upload if available
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "categories");

    const res = await apiClient.post<any>("/upload", formData);
    const rawUrl = res?.url || res?.data?.url;
    if (rawUrl && isValidImageUrl(rawUrl)) {
      return {
        url: normalizeImageUrl(rawUrl),
        key: res.key || res.data?.key || file.name,
      };
    }
  } catch {
    // Graceful fallback for offline / frontend mode
  }

  // In offline / mock mode, convert to persistent base64 Data URL so it saves to localStorage
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({
        url: dataUrl,
        key: `cat_${Date.now()}_${file.name}`,
      });
    };
    reader.onerror = () => {
      const fallbackUrl = typeof window !== "undefined" ? URL.createObjectURL(file) : "";
      resolve({
        url: fallbackUrl,
        key: `cat_${Date.now()}_${file.name}`,
      });
    };
    reader.readAsDataURL(file);
  });
}
export interface PaymentSubmissionDetails {
  payment_method?: string;
  transaction_id?: string;
  payer_name?: string;
  bank_name?: string;
  account_number?: string;
  payment_amount?: number;
  payment_date?: string;
  notes?: string;
}

export interface PaymentUploadResult extends UploadResult {
  order?: any;
}

/**
 * Upload payment proof via REST API or local fallback.
 */
export async function uploadPaymentProof(
  file: File | null,
  orderId: string,
  details?: PaymentSubmissionDetails
): Promise<PaymentUploadResult> {
  try {
    const formData = new FormData();
    if (file) {
      formData.append("receipt", file);
    }
    formData.append("order_id", orderId);
    if (details) {
      if (details.payment_method) formData.append("payment_method", details.payment_method);
      if (details.transaction_id) formData.append("transaction_id", details.transaction_id);
      if (details.payer_name) formData.append("payer_name", details.payer_name);
      if (details.bank_name) formData.append("bank_name", details.bank_name);
      if (details.account_number) formData.append("account_number", details.account_number);
      if (details.payment_amount !== undefined && details.payment_amount !== null) {
        formData.append("payment_amount", String(details.payment_amount));
      }
      if (details.payment_date) formData.append("payment_date", details.payment_date);
      if (details.notes) formData.append("notes", details.notes);
    }

    const res = await apiClient.post<any>(`/orders/${orderId}/payment-proof`, formData);
    const orderData = res?.data || res?.order || res;
    const url = res?.url || res?.data?.url || (file && typeof window !== "undefined" ? URL.createObjectURL(file) : "");
    const key = res?.key || res?.data?.key || file?.name || `proof_${orderId}`;

    return {
      url,
      key,
      order: orderData,
    };
  } catch (error) {
    if (error && typeof error === "object" && "message" in error) {
      throw error;
    }
  }

  const localUrl = file && typeof window !== "undefined" ? URL.createObjectURL(file) : "/placeholder.jpg";
  return {
    url: localUrl,
    key: `local_proof_${orderId}_${Date.now()}`,
  };
}

/**
 * Upload a homepage banner image via REST API or persistent base64 Data URL
 */
export async function uploadBannerImage(file: File): Promise<UploadResult> {
  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  const isImage = validTypes.includes(file.type) || file.type.startsWith("image/");

  if (!isImage) {
    throw new Error("Invalid file format. Please upload a valid image file (PNG, JPG, or WebP).");
  }

  // Attempt REST API upload if available
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "banners");

    const res = await apiClient.post<{ url?: string; data?: { url?: string; key?: string }; key?: string }>("/upload", formData);
    const rawUrl = res?.url || res?.data?.url;
    if (rawUrl && isValidImageUrl(rawUrl)) {
      return {
        url: normalizeImageUrl(rawUrl),
        key: res.key || res.data?.key || file.name,
      };
    }
  } catch (err: any) {
    if (!isFrontendOnly()) {
      throw new Error(err?.message || "Banner image upload failed. Please check network connection.");
    }
  }

  // In offline / mock mode, convert to persistent base64 Data URL so it saves to mockStore / localStorage
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({
        url: dataUrl,
        key: `banner_${Date.now()}_${file.name}`,
      });
    };
    reader.onerror = () => {
      const fallbackUrl = typeof window !== "undefined" ? URL.createObjectURL(file) : "/images/homepage-banner.jpg";
      resolve({
        url: fallbackUrl,
        key: `banner_${Date.now()}_${file.name}`,
      });
    };
    reader.readAsDataURL(file);
  });
}


