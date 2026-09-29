/**
 * product-image-upload-pipeline.test.ts
 *
 * Code-level (source inspection) tests for the Universal Product Image Upload pipeline.
 *
 * Verifies:
 * - Frontend upload component (ProductImagesSection.tsx) reflects 20MB limit, broad format policy
 * - No Image URL controls present
 * - YouTube URL preserved
 * - Backend service (ProductImagePipelineService.php) has correct constants and structure
 * - Upload controller has correct validation limits
 *
 * NO BROWSER TESTING — source inspection only.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) {
    console.log(`✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${msg}`);
    failed++;
  }
}

console.log("=========================================================");
console.log("UNIVERSAL PRODUCT IMAGE UPLOAD PIPELINE VERIFICATION");
console.log("=========================================================");

// ─────────────────────────────────────────────────────────────────────────────
// File paths
// ─────────────────────────────────────────────────────────────────────────────
const root         = path.resolve(__dirname, "..");
const backendRoot  = path.join(root, "backend");
const frontendRoot = path.join(root, "src");

const imagesSectionFile   = path.join(frontendRoot, "components/admin/products/form/ProductImagesSection.tsx");
const pipelineServiceFile = path.join(backendRoot, "app/Services/Media/ProductImagePipelineService.php");
const uploadControllerFile = path.join(backendRoot, "app/Http/Controllers/Api/V1/UploadController.php");

const imagesSection   = fs.readFileSync(imagesSectionFile, "utf-8");
const pipelineService = fs.readFileSync(pipelineServiceFile, "utf-8");
const uploadController = fs.readFileSync(uploadControllerFile, "utf-8");

// ─────────────────────────────────────────────────────────────────────────────
// 1. Frontend upload component — file size limit
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Frontend Upload Component:");

assert(
  imagesSection.includes("20 * 1024 * 1024"),
  "1. Frontend enforces 20 MB limit (20 * 1024 * 1024)"
);

assert(
  !imagesSection.includes("5 * 1024 * 1024"),
  "2. Old 5 MB limit is removed from frontend"
);

assert(
  imagesSection.includes("20 MB"),
  "3. Frontend displays '20 MB' in user-facing limit message"
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Frontend upload component — format acceptance
// ─────────────────────────────────────────────────────────────────────────────

assert(
  imagesSection.includes('accept="image/*"'),
  "4. Frontend accept attribute is broad (image/*) — server is authoritative"
);

assert(
  !imagesSection.includes('accept="image/png,image/jpeg,image/jpg,image/webp"'),
  "5. Restrictive hard-coded accept list is removed"
);

assert(
  imagesSection.includes("gif") && imagesSection.includes("bmp") && imagesSection.includes("avif"),
  "6. Frontend mentions GIF, BMP, AVIF in supported extensions list"
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Frontend upload component — YouTube + no Image URL
// ─────────────────────────────────────────────────────────────────────────────

assert(
  imagesSection.toLowerCase().includes("youtube"),
  "7. YouTube video URL input is preserved"
);

assert(
  !imagesSection.includes("Paste direct image URL") &&
    !imagesSection.includes("Add Image URL") &&
    !imagesSection.includes("imageUrl") &&
    !imagesSection.includes("image_url_tab"),
  "8. Image URL tab / paste-URL controls are absent"
);

assert(
  imagesSection.includes("uploadProductImage"),
  "9. Upload function references server-side upload (not client-side conversion)"
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Frontend upload component — UX text
// ─────────────────────────────────────────────────────────────────────────────

assert(
  imagesSection.includes("Automatically optimized to WebP"),
  "10. UX text informs Admin that images are automatically converted to WebP"
);

assert(
  !imagesSection.includes("up to 5MB"),
  "11. Old '5MB' UX text is removed from frontend"
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Backend service — constants
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Backend Image Pipeline Service:");

assert(
  pipelineService.includes("MAX_UPLOAD_BYTES = 20 * 1024 * 1024"),
  "12. Backend MAX_UPLOAD_BYTES constant is 20 MB"
);

assert(
  !pipelineService.includes("MAX_BYTES = 5 * 1024 * 1024"),
  "13. Old 5 MB constant is removed from backend"
);

assert(
  pipelineService.includes("20 MB upload limit"),
  "14. Backend error message references 20 MB limit"
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. Backend service — supported formats
// ─────────────────────────────────────────────────────────────────────────────

assert(
  pipelineService.includes("image/jpeg") &&
    pipelineService.includes("image/png") &&
    pipelineService.includes("image/webp") &&
    pipelineService.includes("image/gif") &&
    pipelineService.includes("image/bmp") &&
    pipelineService.includes("image/avif"),
  "15. Backend declares support for JPEG, PNG, WebP, GIF, BMP, AVIF"
);

assert(
  !pipelineService.includes("image/tiff") &&
    !pipelineService.includes("image/heic") &&
    !pipelineService.includes("image/heif"),
  "16. Backend does NOT claim support for TIFF, HEIC, HEIF (not supported by GD)"
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. Backend service — pipeline structure (thin controller, rich service)
// ─────────────────────────────────────────────────────────────────────────────

assert(
  pipelineService.includes("processAndStore") &&
    pipelineService.includes("decodeImage") &&
    pipelineService.includes("autoOrientExif") &&
    pipelineService.includes("saveOptimizedWebP") &&
    pipelineService.includes("generateCanonicalPublicUrl"),
  "17. Pipeline service has all required processing methods"
);

assert(
  pipelineService.includes("detectMime") &&
    pipelineService.includes("finfo_open") &&
    pipelineService.includes("FILEINFO_MIME_TYPE"),
  "18. Server validates actual MIME type via finfo (magic bytes), not only client claim"
);

assert(
  pipelineService.includes("gdSupportedMimes") &&
    pipelineService.includes("isGdSupported"),
  "19. Service has runtime format support check (gdSupportedMimes / isGdSupported)"
);

// ─────────────────────────────────────────────────────────────────────────────
// 8. Backend service — WebP output guarantees
// ─────────────────────────────────────────────────────────────────────────────

assert(
  pipelineService.includes("'.webp'"),
  "20. Backend generates .webp filename extension for all output"
);

assert(
  pipelineService.includes("'image/webp'"),
  "21. Backend returns 'image/webp' as canonical MIME type"
);

assert(
  pipelineService.includes("WEBP_QUALITY_STEPS = [85, 80, 75, 72]"),
  "22. WebP quality steps start at 85 and step down to 72"
);

// ─────────────────────────────────────────────────────────────────────────────
// 9. Backend service — EXIF, transparency, animated GIF
// ─────────────────────────────────────────────────────────────────────────────

assert(
  pipelineService.includes("exif_read_data") &&
    pipelineService.includes("imagerotate") &&
    pipelineService.includes("autoOrientExif"),
  "23. EXIF orientation correction is implemented"
);

assert(
  pipelineService.includes("imagealphablending") &&
    pipelineService.includes("imagesavealpha") &&
    pipelineService.includes("imagecolorallocatealpha"),
  "24. Transparency preservation is implemented (alpha channel handling)"
);

assert(
  pipelineService.includes("imagecreatefromgif") &&
    pipelineService.includes("first frame"),
  "25. Animated GIF policy: flatten to first frame (documented in code)"
);

// ─────────────────────────────────────────────────────────────────────────────
// 10. Backend service — security
// ─────────────────────────────────────────────────────────────────────────────

assert(
  pipelineService.includes("Str::random(24)"),
  "26. Server generates safe random filename (never uses original filename)"
);

assert(
  pipelineService.includes("sys_get_temp_dir()") &&
    pipelineService.includes("@unlink"),
  "27. Temp files are cleaned up after processing (unlink in finally block)"
);

assert(
  pipelineService.includes("try {") &&
    pipelineService.includes("} finally {"),
  "28. Resource cleanup uses try/finally to guarantee cleanup on both success and failure"
);

assert(
  !pipelineService.includes("exec(") &&
    !pipelineService.includes("shell_exec(") &&
    !pipelineService.includes("system("),
  "29. No shell_exec/exec/system calls (no arbitrary code execution)"
);

// ─────────────────────────────────────────────────────────────────────────────
// 11. Backend service — error handling (no internal leaks)
// ─────────────────────────────────────────────────────────────────────────────

assert(
  pipelineService.includes("FORMAT_UNSUPPORTED") ||
    pipelineService.includes("not supported by the server"),
  "30. FORMAT_UNSUPPORTED error handled with user-safe message"
);

assert(
  pipelineService.includes("could not be processed") ||
    pipelineService.includes("Image decoding failed"),
  "31. IMAGE_CORRUPTED / IMAGE_DECODE_FAILED handled with user-safe message"
);

assert(
  pipelineService.includes("could not be saved") ||
    pipelineService.includes("Failed to store"),
  "32. IMAGE_STORAGE_FAILED handled with user-safe message"
);

assert(
  !pipelineService.includes("Stack trace") &&
    !pipelineService.includes("DB_PASSWORD"),
  "33. Backend service does not expose stack traces or secrets in messages"
);

// ─────────────────────────────────────────────────────────────────────────────
// 12. Upload controller — validation limits
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Upload Controller:");

assert(
  uploadController.includes("MAX_KB = 20 * 1024"),
  "34. Controller MAX_KB constant is 20 MB (20 * 1024 KB)"
);

assert(
  uploadController.includes("mimes:jpeg,jpg,png,webp,gif,bmp,avif"),
  "35. Controller accepts gif, bmp, avif in addition to jpeg/png/webp"
);

assert(
  uploadController.includes("'max:' . self::MAX_KB"),
  "36. Controller uses MAX_KB constant for file size validation"
);

assert(
  uploadController.includes("20 MB upload limit") ||
    uploadController.includes("20 MB"),
  "37. Controller error messages reference 20 MB limit"
);

assert(
  !uploadController.includes("5MB") && !uploadController.includes("5 MB"),
  "38. Old 5MB references removed from upload controller"
);

assert(
  uploadController.includes("image/webp") ||
    uploadController.includes("converted to WebP"),
  "39. Controller success message acknowledges WebP conversion"
);

// ─────────────────────────────────────────────────────────────────────────────
// 13. Controller thin (delegates to service)
// ─────────────────────────────────────────────────────────────────────────────

assert(
  uploadController.includes("imagePipeline->processAndStore"),
  "40. Controller delegates to pipeline service (thin controller pattern)"
);

assert(
  !uploadController.includes("imagecreatefromjpeg") &&
    !uploadController.includes("imagewebp"),
  "41. Controller does not contain GD image processing code directly"
);

// ─────────────────────────────────────────────────────────────────────────────
// Final results
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n=========================================================");
console.log(`TEST SUITE RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log("=========================================================");

if (failed > 0) {
  process.exit(1);
}
