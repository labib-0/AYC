#!/usr/bin/env node

/**
 * scripts/download-brands.mjs
 * 
 * Reusable brand asset sync script:
 * 1. Copies brand SVGs from node_modules/simple-icons/icons/ into public/brands/
 * 2. Generates authentic wordmark SVGs for fashion brands not present in simple-icons
 * 3. Supports aliases and ensures public/brands/ exists
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SIMPLE_ICONS_DIR = path.join(ROOT_DIR, 'node_modules', 'simple-icons', 'icons');
const PUBLIC_BRANDS_DIR = path.join(ROOT_DIR, 'public', 'brands');

// Initial 25 brands specified by requirement
export const BRAND_DEFINITIONS = [
  {
    name: 'Nike',
    slug: 'nike',
    siSlug: 'nike',
  },
  {
    name: 'Adidas',
    slug: 'adidas',
    siSlug: 'adidas',
  },
  {
    name: 'Puma',
    slug: 'puma',
    siSlug: 'puma',
  },
  {
    name: 'Reebok',
    slug: 'reebok',
    siSlug: 'reebok',
  },
  {
    name: 'Champion',
    slug: 'champion',
    customSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 48" role="img" fill="#000000"><title>Champion</title><g transform="translate(4, 4)"><path d="M22.5 4C12.3 4 4 12.3 4 22.5S12.3 41 22.5 41c6.8 0 12.8-3.7 15.9-9.2l-7.2-3.8c-1.9 3.5-5.6 5.8-9.7 5.8-6.4 0-11.5-5.1-11.5-11.3S15.1 11.2 21.5 11.2c4.1 0 7.8 2.3 9.7 5.8l7.2-3.8C35.3 7.7 29.3 4 22.5 4z" fill="#00205B"/><path d="M25 15.5c-3.9 0-7 3.1-7 7s3.1 7 7 7c2.6 0 4.9-1.4 6.1-3.6h-7.1v-4.8h13.2c.5 1.4.8 2.9.8 4.4 0 7.2-5.8 13-13 13-7.2 0-13-5.8-13-13s5.8-13 13-13c3.5 0 6.7 1.4 9 3.7l-3.5 3.5c-1.4-1.4-3.3-2.2-5.5-2.2z" fill="#DA291C"/></g><text x="48" y="29" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-weight="900" font-style="italic" font-size="21" letter-spacing="-0.5" fill="#00205B">Champion</text></svg>`,
  },
  {
    name: 'Fila',
    slug: 'fila',
    siSlug: 'fila',
  },
  {
    name: 'Vans',
    slug: 'vans',
    customSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 44" role="img" fill="#000000"><title>Vans</title><path d="M12 10h56v5.5H35.8L46.2 34h-8.1L27.6 15.5h-5.4L15.3 34H7.2L12 10z" fill="#000000"/><path d="M47.8 15.5h7.2l6.8 18.5h-7l-1.3-4.2h-6.4l-1.3 4.2h-4.8l6.8-18.5zm3 4.8l-2 6.5h4.2l-2.2-6.5z" fill="#000000"/><path d="M64 15.5h6.6l7.8 11.2V15.5H85v18.5h-6.4l-8.2-11.8v11.8H64V15.5z" fill="#000000"/><path d="M96.5 15.2c5.8 0 9.8 2.6 9.8 7.2 0 4.8-3.8 6.4-7.5 7.4-2.8.8-4.5 1.2-4.5 2.6 0 1.2 1.2 2 3.2 2 2.2 0 4.8-.8 6.8-2.2v4.8c-2.2 1.2-5 1.8-7.5 1.8-6.2 0-10.2-2.8-10.2-7.5 0-4.6 3.6-6.2 7.4-7.2 3-.8 4.6-1.3 4.6-2.6 0-1-.9-1.8-2.8-1.8-2 0-4.2.8-6 1.8v-4.8c2-1 4.5-1.5 6.7-1.5z" fill="#000000"/></svg>`,
  },
  {
    name: 'Converse',
    slug: 'converse',
    customSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 40" role="img" fill="#000000"><title>Converse</title><g transform="translate(4, 8)"><path d="M12 0l3.7 7.5 8.3 1.2-6 5.8 1.4 8.3L12 18.9l-7.4 3.9 1.4-8.3-6-5.8 8.3-1.2z" fill="#000000"/><path d="M26 1.5l-6 10.5 6 10.5h6.5l-6-10.5 6-10.5z" fill="#000000"/></g><text x="44" y="27" font-family="'Arial Black', 'Trebuchet MS', -apple-system, sans-serif" font-weight="900" font-size="20" letter-spacing="2" fill="#000000">CONVERSE</text></svg>`,
  },
  {
    name: 'New Balance',
    slug: 'new-balance',
    siSlug: 'newbalance',
    aliases: ['newbalance'],
  },
  {
    name: 'Under Armour',
    slug: 'under-armour',
    siSlug: 'underarmour',
    aliases: ['underarmour'],
  },
  {
    name: 'The North Face',
    slug: 'the-north-face',
    siSlug: 'thenorthface',
    aliases: ['thenorthface'],
  },
  {
    name: 'Columbia',
    slug: 'columbia',
    customSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 44" role="img" fill="#000000"><title>Columbia</title><g transform="translate(6, 6)" fill="#000000"><rect x="0" y="0" width="7" height="14" rx="1.5"/><rect x="9" y="0" width="7" height="14" rx="1.5"/><rect x="18" y="9" width="14" height="7" rx="1.5"/><rect x="18" y="18" width="14" height="7" rx="1.5"/><rect x="18" y="27" width="7" height="14" rx="1.5" transform="translate(43, 68) rotate(180)"/><rect x="9" y="27" width="7" height="14" rx="1.5" transform="translate(25, 68) rotate(180)"/><rect x="0" y="18" width="14" height="7" rx="1.5" transform="translate(14, 43) rotate(180)"/><rect x="0" y="9" width="14" height="7" rx="1.5" transform="translate(14, 25) rotate(180)"/></g><text x="48" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="21" letter-spacing="0.5" fill="#000000">Columbia</text></svg>`,
  },
  {
    name: 'Patagonia',
    slug: 'patagonia',
    customSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 40" role="img" fill="#000000"><title>Patagonia</title><text x="8" y="28" font-family="Georgia, 'Times New Roman', serif" font-weight="900" font-size="24" letter-spacing="0.5" fill="#000000">patagonia</text></svg>`,
  },
  {
    name: "Levi's",
    slug: 'levis',
    customSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 44" role="img"><title>Levi's</title><path d="M8 8c20 0 40-5 52 5 12-10 32-5 52-5l-6 28c-18 0-36-4-46 4-10-8-28-4-46-4z" fill="#E41C23"/><text x="60" y="27" text-anchor="middle" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="16" letter-spacing="0.5" fill="#FFFFFF">Levi's</text></svg>`,
  },
  {
    name: 'Calvin Klein',
    slug: 'calvin-klein',
    aliases: ['calvinklein'],
    customSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 36" role="img" fill="#000000"><title>Calvin Klein</title><text x="8" y="24" font-family="Futura, 'Century Gothic', -apple-system, sans-serif" font-weight="400" font-size="20" letter-spacing="2" fill="#000000">Calvin Klein</text></svg>`,
  },
  {
    name: 'Tommy Hilfiger',
    slug: 'tommy-hilfiger',
    aliases: ['tommyhilfiger'],
    customSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 44" role="img"><title>Tommy Hilfiger</title><g transform="translate(10, 4)"><rect x="0" y="0" width="150" height="4" fill="#00174F"/><rect x="0" y="4" width="75" height="12" fill="#FFFFFF"/><rect x="75" y="4" width="75" height="12" fill="#CC0C2F"/><rect x="0" y="16" width="150" height="4" fill="#00174F"/></g><text x="85" y="36" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="10.5" letter-spacing="3" fill="#00174F">TOMMY HILFIGER</text></svg>`,
  },
  {
    name: 'Hugo Boss',
    slug: 'hugo-boss',
    aliases: ['hugoboss', 'boss'],
    customSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 40" role="img" fill="#000000"><title>Hugo Boss</title><text x="75" y="24" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="20" letter-spacing="4" fill="#000000">BOSS</text><text x="75" y="34" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="8" letter-spacing="6" fill="#000000">HUGO BOSS</text></svg>`,
  },
  {
    name: 'Ralph Lauren',
    slug: 'ralph-lauren',
    aliases: ['ralphlauren'],
    customSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 42" role="img" fill="#000000"><title>Ralph Lauren</title><text x="85" y="27" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="14.5" letter-spacing="3" fill="#000000">RALPH LAUREN</text></svg>`,
  },
  {
    name: 'Zara',
    slug: 'zara',
    siSlug: 'zara',
  },
  {
    name: 'H&M',
    slug: 'hm',
    siSlug: 'handm',
    aliases: ['handm'],
  },
  {
    name: 'Uniqlo',
    slug: 'uniqlo',
    siSlug: 'uniqlo',
  },
  {
    name: 'Diesel',
    slug: 'diesel',
    customSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 44" role="img"><title>Diesel</title><rect x="4" y="6" width="132" height="32" rx="2" fill="#D32F2F"/><text x="70" y="27" text-anchor="middle" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="18" letter-spacing="1.5" fill="#FFFFFF">DIESEL</text><text x="70" y="34" text-anchor="middle" font-family="'Arial Black', sans-serif" font-weight="700" font-size="4.5" letter-spacing="0.5" fill="#FFFFFF">FOR SUCCESSFUL LIVING</text></svg>`,
  },
  {
    name: 'Timberland',
    slug: 'timberland',
    customSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 44" role="img" fill="#000000"><title>Timberland</title><g transform="translate(8, 6)"><circle cx="16" cy="16" r="14" fill="none" stroke="#000000" stroke-width="2"/><path d="M16 8c-3 3-5 7-5 11 0 4 2 6 5 9 3-3 5-5 5-9 0-4-2-8-5-11z" fill="#000000"/><path d="M11 15c-3 1-5 4-5 6 3 0 5-1 6-2M21 15c3 1 5 4 5 6-3 0-5-1-6-2M13 21c-2 1-4 3-4 5 2 0 4-1 5-2M19 21c2 1 4 3 4 5-2 0-4-1-5-2" stroke="#000000" stroke-width="1.2" stroke-linecap="round"/></g><text x="48" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="17" letter-spacing="0.5" fill="#000000">Timberland</text></svg>`,
  },
  {
    name: 'Mango',
    slug: 'mango',
    customSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 36" role="img" fill="#000000"><title>Mango</title><text x="70" y="25" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="20" letter-spacing="4" fill="#000000">MANGO</text></svg>`,
  },
  {
    name: 'Jack & Jones',
    slug: 'jack-and-jones',
    aliases: ['jackjones'],
    customSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 40" role="img" fill="#000000"><title>Jack &amp; Jones</title><text x="85" y="26" text-anchor="middle" font-family="'Arial Black', -apple-system, sans-serif" font-weight="900" font-size="16" letter-spacing="1.5" fill="#000000">JACK &amp; JONES</text></svg>`,
  },
];

/**
 * Normalizes SVG content to ensure solid fill and proper viewBox
 */
function normalizeSvg(content, name) {
  let res = content.trim();
  // Ensure fill attribute is set if missing so it displays consistently in <img> tags
  if (!res.includes('fill=') && !res.includes('fill:')) {
    res = res.replace('<svg ', '<svg fill="#000000" ');
  }
  return res;
}

export function downloadBrands() {
  console.log('🔄 Starting brand SVG extraction & setup...');

  // Ensure public/brands/ directory exists
  if (!fs.existsSync(PUBLIC_BRANDS_DIR)) {
    fs.mkdirSync(PUBLIC_BRANDS_DIR, { recursive: true });
    console.log(`📁 Created directory: ${PUBLIC_BRANDS_DIR}`);
  }

  let fromSimpleIcons = 0;
  let fromCustom = 0;
  let totalSaved = 0;

  for (const brand of BRAND_DEFINITIONS) {
    let svgContent = null;
    let source = 'custom';

    // 1. Check if simple-icons has this icon
    if (brand.siSlug) {
      const siFilePath = path.join(SIMPLE_ICONS_DIR, `${brand.siSlug}.svg`);
      if (fs.existsSync(siFilePath)) {
        svgContent = fs.readFileSync(siFilePath, 'utf8');
        source = 'simple-icons';
      }
    }

    // 2. Fallback to custom authentic vector
    if (!svgContent && brand.customSvg) {
      svgContent = brand.customSvg;
      source = 'custom';
    }

    if (!svgContent) {
      console.warn(`⚠️ Warning: No SVG available for ${brand.name} (${brand.slug})`);
      continue;
    }

    const processedSvg = normalizeSvg(svgContent, brand.name);
    const destPath = path.join(PUBLIC_BRANDS_DIR, `${brand.slug}.svg`);

    fs.writeFileSync(destPath, processedSvg, 'utf8');
    totalSaved++;

    if (source === 'simple-icons') {
      fromSimpleIcons++;
      console.log(`  ✓ [simple-icons] ${brand.name} -> /brands/${brand.slug}.svg`);
    } else {
      fromCustom++;
      console.log(`  ✓ [vector-wordmark] ${brand.name} -> /brands/${brand.slug}.svg`);
    }

    // Write any aliases (e.g., newbalance.svg for new-balance.svg, handm.svg for hm.svg)
    if (brand.aliases && brand.aliases.length > 0) {
      for (const alias of brand.aliases) {
        const aliasPath = path.join(PUBLIC_BRANDS_DIR, `${alias}.svg`);
        fs.writeFileSync(aliasPath, processedSvg, 'utf8');
        console.log(`    ↳ Alias: /brands/${alias}.svg`);
      }
    }
  }

  console.log(`\n✅ Finished! ${totalSaved} brand SVG assets prepared in public/brands/`);
  console.log(`   • ${fromSimpleIcons} from simple-icons`);
  console.log(`   • ${fromCustom} authentic vector wordmarks`);
}

// Execute if run directly
downloadBrands();
