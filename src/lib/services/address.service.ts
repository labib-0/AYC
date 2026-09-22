import { UserAddress } from "@/types/api";

export const ADDR_STORAGE_KEY = "ayaan_customer_addresses_v1";

export interface AddressFormData {
  label: string;
  name: string;
  contact_name?: string;
  company_name?: string;
  email: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country_code: string;
  country?: string;
  is_default: boolean;
}

export const COUNTRIES = [
  { code: "US", name: "United States", dial: "+1" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "DE", name: "Germany", dial: "+49" },
  { code: "FR", name: "France", dial: "+33" },
  { code: "CA", name: "Canada", dial: "+1" },
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "JP", name: "Japan", dial: "+81" },
  { code: "AE", name: "United Arab Emirates", dial: "+971" },
  { code: "SA", name: "Saudi Arabia", dial: "+966" },
  { code: "IN", name: "India", dial: "+91" },
  { code: "CN", name: "China", dial: "+86" },
  { code: "SG", name: "Singapore", dial: "+65" },
  { code: "TR", name: "Turkey", dial: "+90" },
  { code: "IT", name: "Italy", dial: "+39" },
  { code: "ES", name: "Spain", dial: "+34" },
  { code: "NL", name: "Netherlands", dial: "+31" },
  { code: "BE", name: "Belgium", dial: "+32" },
  { code: "SE", name: "Sweden", dial: "+46" },
  { code: "NO", name: "Norway", dial: "+47" },
  { code: "DK", name: "Denmark", dial: "+45" },
  { code: "PL", name: "Poland", dial: "+48" },
  { code: "BD", name: "Bangladesh", dial: "+880" },
  { code: "PK", name: "Pakistan", dial: "+92" },
  { code: "LK", name: "Sri Lanka", dial: "+94" },
  { code: "VN", name: "Vietnam", dial: "+84" },
  { code: "KR", name: "South Korea", dial: "+82" },
  { code: "HK", name: "Hong Kong SAR", dial: "+852" },
  { code: "NZ", name: "New Zealand", dial: "+64" },
  { code: "ZA", name: "South Africa", dial: "+27" },
  { code: "BR", name: "Brazil", dial: "+55" },
  { code: "MX", name: "Mexico", dial: "+52" },
].sort((a, b) => a.name.localeCompare(b.name));

export function getCountryName(code: string): string {
  const found = COUNTRIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return found ? found.name : code;
}

function generateId(): string {
  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// In-memory store for server-side or fallback
const memoryStore: Record<string, UserAddress[]> = {};

function readLocal(userId: string): UserAddress[] {
  if (typeof window === "undefined") {
    return memoryStore[userId] || [];
  }
  try {
    const raw = localStorage.getItem(ADDR_STORAGE_KEY);
    const all: Record<string, UserAddress[]> = raw ? JSON.parse(raw) : {};
    return all[userId] || [];
  } catch {
    return memoryStore[userId] || [];
  }
}

function writeLocal(userId: string, addresses: UserAddress[]): void {
  memoryStore[userId] = addresses;
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(ADDR_STORAGE_KEY);
    const all: Record<string, UserAddress[]> = raw ? JSON.parse(raw) : {};
    all[userId] = addresses;
    localStorage.setItem(ADDR_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent("ayaan:addresses-updated", { detail: { userId, addresses } }));
  } catch {
    // ignore quota
  }
}

export class AddressService {
  /**
   * Load addresses for a given user
   */
  async getAddresses(userId: string | number): Promise<UserAddress[]> {
    const uId = String(userId || "guest");
    let list = readLocal(uId);

    // If user is a seeded test user and has no addresses yet, seed initial realistic address
    if (list.length === 0 && (uId === "102" || uId === "buyer@ayaanclothing.com")) {
      const seeded: UserAddress = {
        id: "addr_seed_102",
        user_id: uId,
        label: "Headquarters / Main Warehouse",
        name: "Marcus Vance",
        contact_name: "Marcus Vance",
        company_name: "Vance & Co Retail Ltd",
        email: "buyer@ayaanclothing.com",
        phone: "+44 20 7946 0912",
        address_line_1: "12 Oxford Street",
        address_line_2: "Suite 400",
        city: "London",
        state: "Greater London",
        postal_code: "W1D 1BS",
        country_code: "GB",
        country: "United Kingdom",
        is_default: true,
        created_at: new Date().toISOString(),
      };
      list = [seeded];
      writeLocal(uId, list);
    } else if (list.length === 0 && (uId === "101" || uId === "testuser@example.com")) {
      const seeded: UserAddress = {
        id: "addr_seed_101",
        user_id: uId,
        label: "Main Store & Receiving",
        name: "Sarah Jenkins",
        contact_name: "Sarah Jenkins",
        company_name: "Jenkins Apparel Boutique",
        email: "testuser@example.com",
        phone: "+1 555 0199",
        address_line_1: "742 Evergreen Terrace",
        address_line_2: "Building B",
        city: "Springfield",
        state: "OR",
        postal_code: "97477",
        country_code: "US",
        country: "United States",
        is_default: true,
        created_at: new Date().toISOString(),
      };
      list = [seeded];
      writeLocal(uId, list);
    }

    return list;
  }

  /**
   * Get single address by ID
   */
  async getAddressById(userId: string | number, addressId: string | number): Promise<UserAddress | null> {
    const list = await this.getAddresses(userId);
    return list.find((a) => String(a.id) === String(addressId)) || null;
  }

  /**
   * Get default address for user
   */
  async getDefaultAddress(userId: string | number): Promise<UserAddress | null> {
    const list = await this.getAddresses(userId);
    return list.find((a) => a.is_default) || list[0] || null;
  }

  /**
   * Save (create or update) address
   */
  async saveAddress(
    userId: string | number,
    formData: AddressFormData,
    addressId?: string | number
  ): Promise<UserAddress> {
    const uId = String(userId || "guest");
    const current = await this.getAddresses(uId);

    const countryName = formData.country || getCountryName(formData.country_code);
    const contactName = formData.name.trim();

    let targetId = addressId ? String(addressId) : "";
    const isEditing = Boolean(targetId);

    let savedItem: UserAddress;

    if (isEditing) {
      const existing = current.find((a) => String(a.id) === targetId);
      savedItem = {
        ...(existing || {}),
        id: targetId,
        user_id: uId,
        label: formData.label.trim() || "Delivery Address",
        name: contactName,
        contact_name: contactName,
        company_name: formData.company_name?.trim() || "",
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address_line_1: formData.address_line_1.trim(),
        address_line_2: formData.address_line_2?.trim() || "",
        city: formData.city.trim(),
        state: formData.state?.trim() || "",
        postal_code: formData.postal_code.trim(),
        country_code: formData.country_code.toUpperCase(),
        country: countryName,
        is_default: Boolean(formData.is_default),
        updated_at: new Date().toISOString(),
      };
    } else {
      targetId = generateId();
      // If it's the very first address, automatically make it default
      const willBeDefault = formData.is_default || current.length === 0;

      savedItem = {
        id: targetId,
        user_id: uId,
        label: formData.label.trim() || "Main Address",
        name: contactName,
        contact_name: contactName,
        company_name: formData.company_name?.trim() || "",
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address_line_1: formData.address_line_1.trim(),
        address_line_2: formData.address_line_2?.trim() || "",
        city: formData.city.trim(),
        state: formData.state?.trim() || "",
        postal_code: formData.postal_code.trim(),
        country_code: formData.country_code.toUpperCase(),
        country: countryName,
        is_default: willBeDefault,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    let nextList: UserAddress[];

    if (isEditing) {
      nextList = current.map((a) => (String(a.id) === targetId ? savedItem : a));
    } else {
      nextList = [...current, savedItem];
    }

    // Enforce SINGLE DEFAULT rule:
    // If the saved item is default, all other addresses must have is_default = false
    if (savedItem.is_default) {
      nextList = nextList.map((a) => ({
        ...a,
        is_default: String(a.id) === targetId,
      }));
    } else {
      // If the item is NOT default, ensure at least one address remains default if multiple exist
      const hasDefault = nextList.some((a) => a.is_default);
      if (!hasDefault && nextList.length > 0) {
        nextList[0] = { ...nextList[0], is_default: true };
        if (String(savedItem.id) === String(nextList[0].id)) {
          savedItem.is_default = true;
        }
      }
    }

    writeLocal(uId, nextList);
    return savedItem;
  }

  /**
   * Set an address as the default address
   */
  async setDefaultAddress(userId: string | number, addressId: string | number): Promise<UserAddress[]> {
    const uId = String(userId || "guest");
    const current = await this.getAddresses(uId);
    const targetStr = String(addressId);

    const nextList = current.map((a) => ({
      ...a,
      is_default: String(a.id) === targetStr,
    }));

    writeLocal(uId, nextList);
    return nextList;
  }

  /**
   * Delete an address
   */
  async deleteAddress(
    userId: string | number,
    addressId: string | number
  ): Promise<{ success: boolean; addresses: UserAddress[]; promotedDefaultId?: string | number }> {
    const uId = String(userId || "guest");
    const current = await this.getAddresses(uId);
    const targetStr = String(addressId);

    const target = current.find((a) => String(a.id) === targetStr);
    if (!target) {
      return { success: false, addresses: current };
    }

    let nextList = current.filter((a) => String(a.id) !== targetStr);
    let promotedDefaultId: string | number | undefined;

    // If we deleted the default address and other addresses exist, promote the first one to default
    if (target.is_default && nextList.length > 0) {
      nextList = nextList.map((a, idx) => ({
        ...a,
        is_default: idx === 0,
      }));
      promotedDefaultId = nextList[0].id;
    }

    writeLocal(uId, nextList);
    return { success: true, addresses: nextList, promotedDefaultId };
  }
}

export const addressService = new AddressService();
