import fs from "fs";
import path from "path";
import React from "react";
import {
  IconMen,
  IconWomen,
  IconBoys,
  IconGirls,
  IconUnisex,
  AUDIENCE_ITEMS,
} from "../src/components/common/AudienceIcons";
import { AUDIENCE_OPTIONS } from "../src/components/common/AudienceCard";

function runTests() {
  console.log("==================================================");
  console.log("HOMEPAGE AUDIENCE ICONS AUDIT & VERIFICATION TESTS");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
      failed++;
    }
  }

  const cwd = process.cwd();
  const iconsPath = path.join(cwd, "src/components/common/AudienceIcons.tsx");
  const audienceCardPath = path.join(cwd, "src/components/common/AudienceCard.tsx");
  const iconsCode = fs.readFileSync(iconsPath, "utf-8");
  const audienceCardCode = fs.readFileSync(audienceCardPath, "utf-8");

  // 1. Verify all 5 icons are exported functions
  console.log("▶ Group 1: Component Exports & Types");
  assert(typeof IconMen === "function", "IconMen is exported as a React component");
  assert(typeof IconWomen === "function", "IconWomen is exported as a React component");
  assert(typeof IconBoys === "function", "IconBoys is exported as a React component");
  assert(typeof IconGirls === "function", "IconGirls is exported as a React component");
  assert(typeof IconUnisex === "function", "IconUnisex is exported as a React component");

  // 2. Verify inline SVG vector implementation (no raw <img src="..."> network dependency on initial render)
  console.log("\n▶ Group 2: Inline SVG Vector Implementation");
  assert(
    !iconsCode.includes("<img") && iconsCode.includes("<svg"),
    "Audience icons render inline SVG elements instead of raw <img> tags with network/decode failure risk"
  );
  assert(
    iconsCode.includes('viewBox="0 0 512 512"') && iconsCode.includes('fill="currentColor"'),
    "SVG icons use standardized 512x512 viewBox and fill='currentColor' for seamless theme/selection adaptation"
  );

  // 3. Verify static public asset files exist and have no corrupt caBX chunks
  console.log("\n▶ Group 3: Public Asset Files & PNG Chunk Conformance");
  const audiences = ["men", "women", "boys", "girls", "unisex"];
  for (const name of audiences) {
    const pngPath = path.join(cwd, `public/audience-icons/${name}.png`);
    const svgPath = path.join(cwd, `public/audience-icons/${name}.svg`);

    assert(fs.existsSync(pngPath), `public/audience-icons/${name}.png exists`);
    assert(fs.existsSync(svgPath), `public/audience-icons/${name}.svg exists`);

    const pngBuffer = fs.readFileSync(pngPath);
    // Parse PNG chunks
    let pos = 8;
    const chunks: string[] = [];
    while (pos < pngBuffer.length) {
      const length = pngBuffer.readUInt32BE(pos);
      const chunkType = pngBuffer.toString("ascii", pos + 4, pos + 8);
      chunks.push(chunkType);
      pos += 8 + length + 4;
    }
    assert(
      !chunks.includes("caBX"),
      `public/audience-icons/${name}.png has no non-standard caBX chunk (chunks: ${chunks.join(", ")})`
    );
    assert(
      chunks.includes("IHDR") && chunks.includes("IDAT") && chunks.includes("IEND"),
      `public/audience-icons/${name}.png is a standard valid PNG`
    );
  }

  // 4. Verify AUDIENCE_OPTIONS mapping
  console.log("\n▶ Group 4: AUDIENCE_OPTIONS Integrity");
  const expectedNames = ["MEN", "WOMEN", "BOYS", "GIRLS", "UNISEX"];
  const optionNames = AUDIENCE_OPTIONS.map((o) => o.name);
  assert(
    expectedNames.every((n) => optionNames.includes(n as any)),
    "AUDIENCE_OPTIONS contains all 5 required audiences: MEN, WOMEN, BOYS, GIRLS, UNISEX"
  );

  const itemsNames = AUDIENCE_ITEMS.map((item) => item.name);
  assert(
    expectedNames.every((n) => itemsNames.includes(n as any)),
    "AUDIENCE_ITEMS contains all 5 required audiences: MEN, WOMEN, BOYS, GIRLS, UNISEX"
  );

  // 5. Verify AudienceCard and AudienceSection structure
  console.log("\n▶ Group 5: AudienceCard Component Integration");
  assert(
    audienceCardCode.includes("<Icon"),
    "AudienceTile mounts the Icon component directly"
  );
  assert(
    audienceCardCode.includes("w-6 h-6 sm:w-7 sm:h-7 lg:w-7.5 lg:h-7.5 xl:w-8 xl:h-8"),
    "AudienceTile maintains responsive icon container dimensions"
  );

  console.log(`\n==================================================`);
  console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log(`==================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
