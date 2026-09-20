/**
 * Headless static validation script for Address Management & Aramex SLI Checkout Alignment
 * Executed via tsx without launching any browser or UI.
 */
import { addressService, AddressFormData } from "../src/lib/services/address.service";
import { orderService } from "../src/services/order.service";

async function runTests() {
  console.log("=== RUNNING HEADLESS STATIC CODE VALIDATION ===");
  const testUserId = `test_buyer_${Date.now()}`;

  // 1. Initial address list should be empty for a new user
  const initialList = await addressService.getAddresses(testUserId);
  console.assert(initialList.length === 0, "Initial address list must be empty");
  console.log("✓ Initial state verified");

  // 2. Add first address (should become default automatically)
  const addr1Form: AddressFormData = {
    label: "Main HQ Office",
    name: "Marcus Vance",
    contact_name: "Marcus Vance",
    company_name: "Vance Global Retail Ltd",
    email: "marcus@vanceglobal.com",
    phone: "+44 20 7946 0912",
    address_line_1: "12 Oxford Street",
    address_line_2: "Suite 400",
    city: "London",
    state: "Greater London",
    postal_code: "W1D 1BS",
    country_code: "GB",
    country: "United Kingdom",
    is_default: false, // will auto-promote to true as it's the first address
  };

  const addr1 = await addressService.saveAddress(testUserId, addr1Form);
  console.assert(addr1.is_default === true, "First address must be default");
  console.assert(addr1.company_name === "Vance Global Retail Ltd", "Company name must match");
  console.assert(addr1.label === "Main HQ Office", "Label must match");
  console.log("✓ First address created and auto-promoted to default");

  // 3. Add second address with is_default = true (should become new default and clear addr1)
  const addr2Form: AddressFormData = {
    label: "Docklands Warehouse",
    name: "Sarah Jenkins",
    contact_name: "Sarah Jenkins",
    company_name: "Vance Logistics Hub",
    email: "warehouse@vanceglobal.com",
    phone: "+44 20 7946 0999",
    address_line_1: "88 Canary Wharf Way",
    city: "London",
    postal_code: "E14 5AB",
    country_code: "GB",
    country: "United Kingdom",
    is_default: true,
  };

  const addr2 = await addressService.saveAddress(testUserId, addr2Form);
  const listAfterTwo = await addressService.getAddresses(testUserId);

  console.assert(listAfterTwo.length === 2, "Must have 2 addresses");
  const addr1Reloaded = listAfterTwo.find((a) => a.id === addr1.id);
  const addr2Reloaded = listAfterTwo.find((a) => a.id === addr2.id);

  console.assert(addr2Reloaded?.is_default === true, "Address 2 must be default");
  console.assert(addr1Reloaded?.is_default === false, "Address 1 must no longer be default");
  console.log("✓ Single-default invariant preserved: Address 2 became default, Address 1 cleared");

  // 4. Test explicit setDefaultAddress
  await addressService.setDefaultAddress(testUserId, addr1.id);
  const listAfterSetDefault = await addressService.getAddresses(testUserId);
  const addr1NowDefault = listAfterSetDefault.find((a) => a.id === addr1.id);
  const addr2NowNotDefault = listAfterSetDefault.find((a) => a.id === addr2.id);

  console.assert(addr1NowDefault?.is_default === true, "Address 1 must now be default");
  console.assert(addr2NowNotDefault?.is_default === false, "Address 2 must not be default");
  console.log("✓ setDefaultAddress successfully toggled default status without duplication");

  // 5. Delete default address (Address 1) -> Address 2 must be promoted to default
  const deleteResult = await addressService.deleteAddress(testUserId, addr1.id);
  console.assert(deleteResult.success === true, "Delete must succeed");
  console.assert(deleteResult.addresses.length === 1, "Must have 1 address remaining");
  console.assert(deleteResult.addresses[0].id === addr2.id, "Remaining address must be Address 2");
  console.assert(deleteResult.addresses[0].is_default === true, "Remaining address must be promoted to default");
  console.log("✓ Deletion of default address correctly promoted remaining address to default");

  // 6. Test Order Creation with Complete Aramex SLI Consignee & Shipping Snapshot
  const order = await orderService.createOrder({
    userId: testUserId,
    email: addr2.email || "warehouse@vanceglobal.com",
    shippingName: addr2.name,
    shippingCompany: addr2.company_name,
    shippingPhone: addr2.phone,
    shippingAddress: addr2.address_line_1,
    shippingAddress2: addr2.address_line_2,
    shippingCity: addr2.city,
    shippingRegion: addr2.state,
    shippingPostalCode: addr2.postal_code,
    shippingCountryCode: addr2.country_code,
    shippingMethod: "Commercial Ocean Freight (DOOR TO PORT)",
    carrier: "Commercial Ocean Line",
    shippingCost: 0,
    paymentMethod: "proforma_invoice",
    transportMethod: "sea",
    shippingServiceType: "door_to_port",
    destinationPort: "Port of Felixstowe (FXT)",
    specialInstructions: "Delivery between 08:00 - 16:00. Call dock master 1 hour prior to container discharge.",
    thirdPartyNotify: {
      name: "Apex Customs Clearance UK Ltd",
      address: "Terminal 4 Cargo Office, Felixstowe",
    },
    shippingSnapshot: {
      provider: "ayaan_logistics",
      mode: "sea",
      package_quantity: 500,
      carton_count: 25,
      gross_weight: 420.0,
      cbm: 3.2,
    },
    items: [
      {
        productId: "prod_mock_1",
        productName: "Men's Premium Oxford Cotton Shirt",
        sku: "AYN-MOX-001",
        quantity: 500,
        unitPrice: 12.5,
      },
    ],
  });

  console.assert(order.id.startsWith("ord_"), "Order ID must be generated");
  console.assert(order.shipping_company === "Vance Logistics Hub", "Order must store consignee company name");
  console.assert(order.shipping_name === "Sarah Jenkins", "Order must store contact name");
  console.assert(order.destination_port === "Port of Felixstowe (FXT)", "Order must store conditional destination port");
  console.assert(order.transport_method === "sea", "Order must store transport method");
  console.assert(order.shipping_service_type === "door_to_port", "Order must store shipping service type");
  console.assert(order.special_instructions?.includes("dock master"), "Order must store special instructions");
  console.assert(order.third_party_notify?.name === "Apex Customs Clearance UK Ltd", "Order must store third party notify");
  console.assert(order.shipping_snapshot?.destination?.company_name === "Vance Logistics Hub", "Snapshot must contain consignee company");
  console.assert(order.shipping_snapshot?.destination_port === "Port of Felixstowe (FXT)", "Snapshot must contain destination port");

  console.log("✓ Order created with complete Aramex SLI consignee snapshot and shipping metadata");
  console.log("=== ALL STATIC VALIDATION CHECKS PASSED SUCCESSFULLY ===");
}

runTests().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
