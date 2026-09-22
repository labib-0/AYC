import { apiClient } from "@/services/api-client";

export interface UploadResult {
  url: string;
  key: string;
  error?: any;
}

/**
 * Upload a product image via Laravel REST API (/upload or /products/images)
 * Falls back to local Object URL in development
 */
export async function uploadProductImage(file: File): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "products");

    const res = await apiClient.post<any>("/upload", formData);
    if (res?.url || res?.data?.url) {
      return {
        url: res.url || res.data.url,
        key: res.key || res.data.key || file.name,
      };
    }
  } catch {
    // Graceful fallback for offline / development
  }

  // Support persistent offline/frontend preview via Data URL, falling back to Object URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        url: reader.result as string,
        key: `local_${Date.now()}_${file.name}`,
      });
    };
    reader.onerror = () => {
      const localUrl = typeof window !== "undefined" ? URL.createObjectURL(file) : "/placeholder.jpg";
      resolve({
        url: localUrl,
        key: `local_${Date.now()}_${file.name}`,
      });
    };
    reader.readAsDataURL(file);
  });
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
    if (res?.url || res?.data?.url) {
      return {
        url: res.url || res.data.url,
        key: res.key || res.data.key || file.name,
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
    if (res?.url || res?.data?.url) {
      return {
        url: res.url || res.data.url,
        key: res.key || res.data.key || file.name,
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
/**
 * Upload payment proof via Laravel REST API (/orders/:id/payment-proof)
 */
export async function uploadPaymentProof(file: File, orderId: string): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append("receipt", file);
    formData.append("order_id", orderId);

    const res = await apiClient.post<any>(`/orders/${orderId}/payment-proof`, formData);
    if (res?.url || res?.data?.url) {
      return {
        url: res.url || res.data.url,
        key: res.key || res.data.key || file.name,
      };
    }
  } catch {
    // Graceful fallback for offline / development
  }

  const localUrl = typeof window !== "undefined" ? URL.createObjectURL(file) : "/placeholder.jpg";
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
    if (res?.url || res?.data?.url) {
      return {
        url: res.url || res.data?.url || "",
        key: res.key || res.data?.key || file.name,
      };
    }
  } catch {
    // Graceful fallback for offline / frontend mode
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

/**
 * Upload a promotional campaign asset via REST API or persistent base64 Data URL
 */
export async function uploadPromotionImage(file: File): Promise<UploadResult> {
  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  const isImage = validTypes.includes(file.type) || file.type.startsWith("image/");

  if (!isImage) {
    throw new Error("Invalid file format. Please upload a valid image file (PNG, JPG, or WebP).");
  }

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "promotions");

    const res = await apiClient.post<{ url?: string; data?: { url?: string; key?: string }; key?: string }>("/upload", formData);
    if (res?.url || res?.data?.url) {
      return {
        url: res.url || res.data?.url || "",
        key: res.key || res.data?.key || file.name,
      };
    }
  } catch {
    // Graceful fallback for offline / frontend mode
  }

  if (typeof FileReader !== "undefined") {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          url: dataUrl,
          key: `promo_${Date.now()}_${file.name}`,
        });
      };
      reader.onerror = () => {
        const fallbackUrl = typeof window !== "undefined" ? URL.createObjectURL(file) : "/images/homepage-banner.jpg";
        resolve({
          url: fallbackUrl,
          key: `promo_${Date.now()}_${file.name}`,
        });
      };
      reader.readAsDataURL(file);
    });
  }

  if (typeof file.arrayBuffer === "function") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "image/png";
    return {
      url: `data:${mime};base64,${buffer.toString("base64")}`,
      key: `promo_${Date.now()}_${file.name}`,
    };
  }

  return {
    url: "/images/homepage-banner.jpg",
    key: `promo_${Date.now()}_${file.name}`,
  };
}

