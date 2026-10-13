/**
 * Ayaan Clothing — Product Description Structured Template Generator & Synchronizer
 *
 * Implements the canonical AYAAN CLOTHING structured description template for products:
 *
 * Item: {name}
 * Brand: {brand}
 *
 * Quantity: {quantity}
 * Colors: {colors}
 * Sizes: {sizes}
 *
 * Fabric: {fabric}
 * Style: {style}
 * Fit: {fit}
 */

export interface ProductDescriptionTemplateData {
  item?: string | null;
  brand?: string | null;
  quantity?: string | number | null;
  colors?: string | string[] | null;
  sizes?: string | string[] | null;
  fabric?: string | null;
  style?: string | null;
  fit?: string | null;
}

export const CANONICAL_TEMPLATE_LABELS = [
  "Item",
  "Brand",
  "Quantity",
  "Colors",
  "Sizes",
  "Fabric",
  "Style",
  "Fit",
] as const;

export type TemplateLabel = (typeof CANONICAL_TEMPLATE_LABELS)[number];

/**
 * Format any field value into a clean trimmed string.
 * Arrays of strings (e.g. colors, sizes) are joined with a comma and space.
 * Numbers > 0 are converted to string; numbers <= 0 return empty string.
 * Null/undefined return empty string.
 */
export function formatTemplateValue(val: string | number | string[] | undefined | null): string {
  if (val === undefined || val === null) return "";
  if (Array.isArray(val)) {
    return val
      .map((item) => (item !== undefined && item !== null ? String(item).trim() : ""))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof val === "number") {
    return val > 0 ? String(val) : "";
  }
  return String(val).trim();
}

/**
 * Default blank structured template string.
 */
export const DEFAULT_PRODUCT_DESCRIPTION_TEMPLATE = [
  "Item: ",
  "Brand: ",
  "",
  "Quantity: ",
  "Colors: ",
  "Sizes: ",
  "",
  "Fabric: ",
  "Style: ",
  "Fit:",
].join("\n");

/**
 * Generate a clean structured description template populated with available data.
 * Missing/empty fields leave the value blank while retaining the label.
 */
export function buildProductDescriptionTemplate(data?: ProductDescriptionTemplateData): string {
  const item = formatTemplateValue(data?.item);
  const brand = formatTemplateValue(data?.brand);
  const quantity = formatTemplateValue(data?.quantity);
  const colors = formatTemplateValue(data?.colors);
  const sizes = formatTemplateValue(data?.sizes);
  const fabric = formatTemplateValue(data?.fabric);
  const style = formatTemplateValue(data?.style);
  const fit = formatTemplateValue(data?.fit);

  return [
    item ? `Item: ${item}` : "Item: ",
    brand ? `Brand: ${brand}` : "Brand: ",
    "",
    quantity ? `Quantity: ${quantity}` : "Quantity: ",
    colors ? `Colors: ${colors}` : "Colors: ",
    sizes ? `Sizes: ${sizes}` : "Sizes: ",
    "",
    fabric ? `Fabric: ${fabric}` : "Fabric: ",
    style ? `Style: ${style}` : "Style: ",
    fit ? `Fit: ${fit}` : "Fit:",
  ].join("\n");
}

/**
 * Check if a given text contains the signature structured template labels.
 */
export function isProductDescriptionTemplate(text: string | null | undefined): boolean {
  if (!text || typeof text !== "string") return false;
  // Must contain at least Item: and Brand: headers to be recognized as template
  const hasItem = /^[ \t]*Item:[ \t]*/m.test(text);
  const hasBrand = /^[ \t]*Brand:[ \t]*/m.test(text);
  const hasColors = /^[ \t]*Colors:[ \t]*/m.test(text);
  const hasSizes = /^[ \t]*Sizes:[ \t]*/m.test(text);
  const hasFabric = /^[ \t]*Fabric:[ \t]*/m.test(text);

  return hasItem && hasBrand && (hasColors || hasSizes || hasFabric);
}

/**
 * Parse structured template fields from a description string.
 */
export function parseProductDescriptionTemplate(
  text: string | null | undefined
): ProductDescriptionTemplateData | null {
  if (!text || typeof text !== "string") return null;

  const hasItem = /^[ \t]*Item:[ \t]*(.*)$/m.test(text);
  const hasBrand = /^[ \t]*Brand:[ \t]*(.*)$/m.test(text);
  if (!hasItem && !hasBrand) return null;

  const getMatch = (label: string): string => {
    const regex = new RegExp(`^[ \\t]*${label}:[ \\t]*(.*)$`, "m");
    const m = text.match(regex);
    return m ? m[1].trim() : "";
  };

  return {
    item: getMatch("Item"),
    brand: getMatch("Brand"),
    quantity: getMatch("Quantity"),
    colors: getMatch("Colors"),
    sizes: getMatch("Sizes"),
    fabric: getMatch("Fabric"),
    style: getMatch("Style"),
    fit: getMatch("Fit"),
  };
}

/**
 * Safely synchronize template fields within currentDescription.
 *
 * Rules:
 * 1. If !isManuallyEdited, regenerates the clean template from current form fields.
 * 2. If isManuallyEdited:
 *    - If the current description contains template structure:
 *      Updates mapped lines without altering administrator-written fields (e.g. Style, Fit, notes)
 *      or lines that the user explicitly edited.
 *    - If the current description does not contain template structure (free-form paragraph):
 *      Leaves the description completely untouched.
 *
 * @param currentDescription The current description text in the form
 * @param newFields The updated form data (name, brand, material, colors, sizes, etc.)
 * @param isManuallyEdited Whether the user has typed or modified the description textarea
 * @param previousFormFields Previous form field values (used to detect if a specific line was user-customized)
 */
export function syncProductDescription(
  currentDescription: string,
  newFields: ProductDescriptionTemplateData,
  isManuallyEdited: boolean,
  previousFormFields?: ProductDescriptionTemplateData
): string {
  // If not manually edited, or current description is empty, regenerate template cleanly
  if (!isManuallyEdited || !currentDescription || currentDescription.trim() === "") {
    return buildProductDescriptionTemplate(newFields);
  }

  // If manually edited, verify if template labels exist
  if (!isProductDescriptionTemplate(currentDescription)) {
    // User wrote a completely custom, non-template description — do NOT overwrite
    return currentDescription;
  }

  // Parse existing values from the current text
  const existingValues = parseProductDescriptionTemplate(currentDescription) || {};

  let result = currentDescription;

  // Safe line replacer
  const updateLine = (
    label: TemplateLabel,
    newVal: string | number | string[] | undefined | null,
    prevVal?: string | number | string[] | undefined | null
  ) => {
    const formattedNew = formatTemplateValue(newVal);
    const existingVal = formatTemplateValue(
      (existingValues as Record<string, string | number | string[] | null | undefined>)[
        label.toLowerCase()
      ]
    );
    const formattedPrev = formatTemplateValue(prevVal);

    // If the line currently has a value that differs from previous form value,
    // AND is not empty, the user manually customized this specific line: PRESERVE IT!
    if (existingVal !== "" && existingVal !== formattedPrev) {
      return;
    }

    // Determine replacement format
    const emptyWithSpace = label !== "Fit";
    const replacement = formattedNew
      ? `${label}: ${formattedNew}`
      : `${label}:${emptyWithSpace ? " " : ""}`;

    const lineRegex = new RegExp(`^[ \\t]*${label}:[ \\t]*.*$`, "m");
    if (lineRegex.test(result)) {
      result = result.replace(lineRegex, replacement);
    }
  };

  if (newFields.item !== undefined) {
    updateLine("Item", newFields.item, previousFormFields?.item);
  }
  if (newFields.brand !== undefined) {
    updateLine("Brand", newFields.brand, previousFormFields?.brand);
  }
  if (newFields.quantity !== undefined) {
    updateLine("Quantity", newFields.quantity, previousFormFields?.quantity);
  }
  if (newFields.colors !== undefined) {
    updateLine("Colors", newFields.colors, previousFormFields?.colors);
  }
  if (newFields.sizes !== undefined) {
    updateLine("Sizes", newFields.sizes, previousFormFields?.sizes);
  }
  if (newFields.fabric !== undefined) {
    updateLine("Fabric", newFields.fabric, previousFormFields?.fabric);
  }
  if (newFields.style !== undefined && formatTemplateValue(newFields.style)) {
    updateLine("Style", newFields.style, previousFormFields?.style);
  }
  if (newFields.fit !== undefined && formatTemplateValue(newFields.fit)) {
    updateLine("Fit", newFields.fit, previousFormFields?.fit);
  }

  return result;
}
