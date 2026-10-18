import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { mockStore } from "../src/lib/mock-data/mock-store";
import { buildOfferSheetData } from "../src/lib/offer-sheet";
import { generateOfferSheetPDFDoc } from "../src/lib/pdf-generator";

const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/31cacd12-715a-409b-bae1-a43267ea2420";

// Ensure artifacts dir exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

// 1x1 test JPEG
const DUMMY_JPEG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

async function renderPdfPages(pdfPath: string, prefix: string) {
  const swiftScript = `
import PDFKit
import AppKit

let url = URL(fileURLWithPath: "${pdfPath}")
guard let doc = PDFDocument(url: url) else { 
    print("Failed to open PDF")
    exit(1) 
}

print("Page count: \\(doc.pageCount)")
for i in 0..<doc.pageCount {
    guard let page = doc.page(at: i) else { continue }
    let pageRect = page.bounds(for: .mediaBox)
    // Scale 2x for crisp rendering
    let scale: CGFloat = 2.0
    let targetSize = NSSize(width: pageRect.width * scale, height: pageRect.height * scale)
    let image = NSImage(size: targetSize)
    image.lockFocus()
    guard let context = NSGraphicsContext.current?.cgContext else { continue }
    context.setFillColor(NSColor.white.cgColor)
    context.fill(CGRect(origin: .zero, size: targetSize))
    context.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: context)
    image.unlockFocus()
    if let tiff = image.tiffRepresentation,
       let rep = NSBitmapImageRep(data: tiff),
       let png = rep.representation(using: .png, properties: [:]) {
        let outPath = "${ARTIFACTS_DIR}/${prefix}_page_\\(i + 1).png"
        try? png.write(to: URL(fileURLWithPath: outPath))
        print("Generated: \\(outPath)")
    }
}
`;

  const tmpSwiftPath = `/tmp/render_${prefix}.swift`;
  fs.writeFileSync(tmpSwiftPath, swiftScript, "utf8");
  execSync(`swift ${tmpSwiftPath}`, { stdio: "inherit" });
  fs.unlinkSync(tmpSwiftPath);
}

async function run() {
  console.log("=== Generating Representative Offer Sheet PDFs ===");

  // Case 1: Standard Representative Product (prd0001: 3 tiers, specs, logistics, 5 images)
  const baseProd = mockStore.getProducts()[0];
  const prod1 = {
    ...baseProd,
    images: [
      baseProd.images?.[0] || DUMMY_JPEG,
      baseProd.images?.[1] || DUMMY_JPEG,
      baseProd.images?.[2] || DUMMY_JPEG,
      DUMMY_JPEG + "#sample4",
      DUMMY_JPEG + "#sample5",
    ],
  };

  const offerData1 = buildOfferSheetData({
    ...prod1,
    docNumber: "OS-LEVIS-PRD0001-2026",
    date: "2026-10-18",
    validUntil: "2026-11-18",
  });

  const doc1 = generateOfferSheetPDFDoc(offerData1);
  const pdf1Path = path.join(ARTIFACTS_DIR, "offer_sheet_representative.pdf");
  fs.writeFileSync(pdf1Path, Buffer.from(doc1.output("arraybuffer")));
  console.log(`Saved PDF 1: ${pdf1Path}`);
  await renderPdfPages(pdf1Path, "offer_sheet_representative");

  // Case 2: Product with Missing Specifications (Testing "In Description" fallback)
  const prod2 = {
    id: "prd_sparse",
    name: "Minimal Configured Classic Denim Shirt with Unspecified Attributes",
    sku: "AYN-DENIM-SPARSE-001",
    brand: "AYAAN CLOTHING",
    description: "Export quality heavy-wash denim shirt with reinforced stitching. Specifications such as fabric blend and color assortment are detailed in this descriptive specification summary.",
    standardPrice: 14.5,
    wholesalePrice: 14.5,
    moq: 30,
    bulkPricingEnabled: true,
    bulkPrice: 11.5,
    bulkThreshold: 150,
    // Unspecified designType, material, size, colour
    images: [DUMMY_JPEG + "#img1", DUMMY_JPEG + "#img2", DUMMY_JPEG + "#img3", DUMMY_JPEG + "#img4"],
  };

  const offerData2 = buildOfferSheetData({
    ...prod2,
    docNumber: "OS-DENIM-SPARSE-2026",
    date: "2026-10-18",
    validUntil: "2026-11-18",
  });

  const doc2 = generateOfferSheetPDFDoc(offerData2);
  const pdf2Path = path.join(ARTIFACTS_DIR, "offer_sheet_missing_specs.pdf");
  fs.writeFileSync(pdf2Path, Buffer.from(doc2.output("arraybuffer")));
  console.log(`Saved PDF 2: ${pdf2Path}`);
  await renderPdfPages(pdf2Path, "offer_sheet_missing_specs");

  // Case 3: Product with Long Title and 9 Gallery Images (Testing 4 per row, row page break, and zero footer overlap)
  const prod3 = {
    id: "prd_multipage",
    name: "Premium Luxury Hand-Embroidered High-Density Combed Cotton Full-Zip Technical Performance Parka Jacket with Detachable Thermal Lining (Winter Export Collection)",
    sku: "AYN-LUX-PARKA-W26",
    brand: "AYAAN APPAREL",
    description: "Architecturally constructed multi-weather technical winter outerwear parka featuring water-resistant shell, taped seams, ergonomic elbow articulation, and heavy-gauge dual zipper hardware. Custom dye-matched ribbing and concealed utility pockets.",
    standardPrice: 48.0,
    wholesalePrice: 48.0,
    moq: 25,
    bulkPricingEnabled: true,
    bulkPrice: 38.0,
    bulkThreshold: 100,
    fullStockPrice: 32.0,
    availableStock: 450,
    isFullStockEligible: true,
    designType: "MASTER COPY",
    material: "92% Polyamide, 8% Elastane with 100% Recycled Poly Lining",
    sizeDescription: "S, M, L, XL, XXL (European Proportions)",
    colourDescription: "Matte Black, Deep Navy, Olive Drab",
    images: [
      DUMMY_JPEG + "#parka1",
      DUMMY_JPEG + "#parka2",
      DUMMY_JPEG + "#parka3",
      DUMMY_JPEG + "#parka4",
      DUMMY_JPEG + "#parka5",
      DUMMY_JPEG + "#parka6",
      DUMMY_JPEG + "#parka7",
      DUMMY_JPEG + "#parka8",
      DUMMY_JPEG + "#parka9",
    ],
  };

  const offerData3 = buildOfferSheetData({
    ...prod3,
    docNumber: "OS-LUX-PARKA-2026",
    date: "2026-10-18",
    validUntil: "2026-11-18",
  });

  const doc3 = generateOfferSheetPDFDoc(offerData3);
  const pdf3Path = path.join(ARTIFACTS_DIR, "offer_sheet_multipage_gallery.pdf");
  fs.writeFileSync(pdf3Path, Buffer.from(doc3.output("arraybuffer")));
  console.log(`Saved PDF 3: ${pdf3Path}`);
  await renderPdfPages(pdf3Path, "offer_sheet_multipage_gallery");

  console.log("=== All PDFs and Rendered Images Generated Successfully ===");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
