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
 * Format quantity into a standardized template string: "[quantity] pcs".
 * Formats numbers with comma separators (e.g. 6000 -> "6,000 pcs").
 * If the value already includes pcs/pc/pieces/piece, normalizes the number with commas and formats as "X pcs".
 * Non-positive numbers, empty strings, null, and undefined return "".
 * Non-numeric custom text (e.g. "Approx 5,000 units") is preserved trimmed.
 */
export function formatTemplateQuantity(val: string | number | string[] | undefined | null): string {
  if (val === undefined || val === null) return "";

  if (Array.isArray(val)) {
    val = val.filter(Boolean).join(", ");
  }

  if (typeof val === "number") {
    if (isNaN(val) || val <= 0) return "";
    return `${val.toLocaleString("en-US")} pcs`;
  }

  const str = String(val).trim();
  if (!str) return "";

  // Check if string contains a number, optionally with commas and unit like 'pcs', 'pc', 'pieces', 'piece'
  const match = str.match(/^([\d,]+)(?:\s*(?:pcs|pc|pieces|piece))?$/i);
  if (match) {
    const rawNumStr = match[1].replace(/,/g, "");
    const num = Number(rawNumStr);
    if (!isNaN(num) && num > 0) {
      return `${num.toLocaleString("en-US")} pcs`;
    }
  }

  return str;
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
  const quantity = formatTemplateQuantity(data?.quantity);
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
  const hasQuantity = /^[ \t]*Quantity:[ \t]*/m.test(text);

  return (hasItem && hasBrand) || ((hasItem || hasBrand) && (hasQuantity || hasColors || hasSizes || hasFabric));
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
  const hasQuantity = /^[ \t]*Quantity:[ \t]*(.*)$/m.test(text);
  if (!hasItem && !hasBrand && !hasQuantity) return null;

  const getMatch = (label: string): string => {
    const regex = new RegExp(`^[ \\t]*${label}:[ \\t]*(.*)$`, "gm");
    const matches = [...text.matchAll(regex)];
    for (const m of matches) {
      if (m[1] && m[1].trim()) {
        return m[1].trim();
      }
    }
    return matches.length > 0 ? matches[0][1].trim() : "";
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
 * Safely rebuild/regenerate the structured product description template.
 *
 * Safe merge strategy:
 * 1. If formFields has an authoritative quantity, populates Quantity: [actual quantity] pcs.
 * 2. If formFields has no authoritative quantity, but currentDescription contains a non-empty
 *    Quantity value, preserves the existing quantity value.
 * 3. Never overwrites a valid manually entered quantity with a blank value.
 * 4. Never duplicates the Quantity line.
 * 5. Strictly keeps the canonical template structure and field order:
 *    - Item
 *    - Brand
 *    - Quantity
 *    - Colors
 *    - Sizes
 *    - Fabric
 *    - Style
 *    - Fit
 * 6. Preserves administrator manual edits to Style, Fit, and custom appended notes/sections.
 */
export function regenerateProductDescriptionTemplate(
  currentDescription: string | null | undefined,
  formFields: ProductDescriptionTemplateData
): string {
  if (!currentDescription || currentDescription.trim() === "") {
    return buildProductDescriptionTemplate(formFields);
  }

  // Parse existing template fields if present
  const existingValues = parseProductDescriptionTemplate(currentDescription);

  // Fallback match for quantity even in non-standard text
  const manualQtyMatch = currentDescription.match(/^[ \t]*Quantity:[ \t]*(.*)$/m);
  const manualQty = manualQtyMatch ? manualQtyMatch[1].trim() : "";

  // 1. Resolve Quantity:
  // - Authoritative canonical quantity from form fields takes precedence if available
  // - If form quantity is empty/unavailable, preserve existing non-empty quantity
  // - Do not overwrite valid manual quantity with blank
  const formQtyFormatted = formatTemplateQuantity(formFields.quantity);
  const existingQtyFormatted = formatTemplateQuantity(existingValues?.quantity || manualQty);
  const resolvedQuantity = formQtyFormatted !== "" ? formQtyFormatted : existingQtyFormatted;

  // 2. Resolve other canonical fields:
  // - For form-managed fields (Item, Brand, Colors, Sizes, Fabric), formFields take precedence;
  //   fallback to existingValues if form field is empty
  // - For user-authored fields (Style, Fit), formFields take precedence only if non-empty,
  //   otherwise preserve existing user-authored value
  const formItem = formatTemplateValue(formFields.item);
  const existingItem = formatTemplateValue(existingValues?.item);
  const resolvedItem = formItem || existingItem;

  const formBrand = formatTemplateValue(formFields.brand);
  const existingBrand = formatTemplateValue(existingValues?.brand);
  const resolvedBrand = formBrand || existingBrand;

  const formColors = formatTemplateValue(formFields.colors);
  const existingColors = formatTemplateValue(existingValues?.colors);
  const resolvedColors = formColors || existingColors;

  const formSizes = formatTemplateValue(formFields.sizes);
  const existingSizes = formatTemplateValue(existingValues?.sizes);
  const resolvedSizes = formSizes || existingSizes;

  const formFabric = formatTemplateValue(formFields.fabric);
  const existingFabric = formatTemplateValue(existingValues?.fabric);
  const resolvedFabric = formFabric || existingFabric;

  const formStyle = formatTemplateValue(formFields.style);
  const existingStyle = formatTemplateValue(existingValues?.style);
  const resolvedStyle = formStyle || existingStyle;

  const formFit = formatTemplateValue(formFields.fit);
  const existingFit = formatTemplateValue(existingValues?.fit);
  const resolvedFit = formFit || existingFit;

  // 3. Extract any custom appended notes or content (e.g. after Fit:)
  let customAppendedContent = "";
  const fitLineMatch = currentDescription.match(/^[ \t]*Fit:[ \t]*[^\n]*(?:\n+([\s\S]*))?$/m);
  if (fitLineMatch && fitLineMatch[1] && fitLineMatch[1].trim()) {
    customAppendedContent = `\n\n${fitLineMatch[1].trim()}`;
  }

  // 4. Construct canonical template ensuring exact field order and single Quantity line
  const templateLines = [
    resolvedItem ? `Item: ${resolvedItem}` : "Item: ",
    resolvedBrand ? `Brand: ${resolvedBrand}` : "Brand: ",
    "",
    resolvedQuantity ? `Quantity: ${resolvedQuantity}` : "Quantity: ",
    resolvedColors ? `Colors: ${resolvedColors}` : "Colors: ",
    resolvedSizes ? `Sizes: ${resolvedSizes}` : "Sizes: ",
    "",
    resolvedFabric ? `Fabric: ${resolvedFabric}` : "Fabric: ",
    resolvedStyle ? `Style: ${resolvedStyle}` : "Style: ",
    resolvedFit ? `Fit: ${resolvedFit}` : "Fit:",
  ];

  return templateLines.join("\n") + customAppendedContent;
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
    const formattedNew = label === "Quantity" ? formatTemplateQuantity(newVal) : formatTemplateValue(newVal);
    const existingVal = label === "Quantity"
      ? formatTemplateQuantity(existingValues.quantity)
      : formatTemplateValue(
          (existingValues as Record<string, string | number | string[] | null | undefined>)[
            label.toLowerCase()
          ]
        );
    const formattedPrev = label === "Quantity" ? formatTemplateQuantity(prevVal) : formatTemplateValue(prevVal);

    // If the line currently has a valid value, and the new value is empty,
    // do NOT overwrite the valid existing value with a blank value!
    if (existingVal !== "" && formattedNew === "") {
      return;
    }

    // If the line currently has a value that differs from previous form value,
    // AND is not empty, the user manually customized this specific line: PRESERVE IT!
    if (existingVal !== "" && existingVal !== formattedPrev && formattedNew === formattedPrev) {
      return;
    }

    // Determine replacement format
    const emptyWithSpace = label !== "Fit";
    const replacement = formattedNew
      ? `${label}: ${formattedNew}`
      : `${label}:${emptyWithSpace ? " " : ""}`;

    const lineRegex = new RegExp(`^[ \\t]*${label}:[ \\t]*.*$`, "m");
    if (lineRegex.test(result)) {
      // Replace the first occurrence
      result = result.replace(lineRegex, replacement);
      // Remove any duplicate occurrences of this label if they exist
      let seen = false;
      result = result.replace(new RegExp(`^[ \\t]*${label}:[ \\t]*.*$`, "gm"), (match) => {
        if (!seen) {
          seen = true;
          return match;
        }
        return "";
      }).replace(/\n{3,}/g, "\n\n");
    } else {
      // If label is missing from the template, insert it in the canonical position
      if (label === "Quantity") {
        if (/^[ \t]*Brand:[ \t]*.*$/m.test(result)) {
          result = result.replace(/(^[ \t]*Brand:[ \t]*.*$)/m, `$1\n\n${replacement}`);
        } else if (/^[ \t]*Colors:[ \t]*.*$/m.test(result)) {
          result = result.replace(/(^[ \t]*Colors:[ \t]*.*$)/m, `${replacement}\n$1`);
        }
      }
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
