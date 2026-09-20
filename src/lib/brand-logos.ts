/**
 * Global Brand Logo Dictionary & Resolution Utilities
 * Maps brand names and slugs to verified static logo assets.
 */

export const BRAND_LOGO_MAP: Record<string, string> = {
  "ayaan": "/logo.png",
  "ayaan clothing": "/logo.png",
  "ayc": "/logo.png",
  "nike": "/brands/nike.svg",
  "adidas": "/brands/adidas.svg",
  "puma": "/brands/puma.svg",
  "reebok": "/brands/reebok.svg",
  "champion": "/brands/champion.svg",
  "fila": "/brands/fila.svg",
  "vans": "/brands/vans.svg",
  "converse": "/brands/converse.svg",
  "under armour": "/brands/under-armour.svg",
  "under-armour": "/brands/under-armour.svg",
  "underarmour": "/brands/under-armour.svg",
  "new balance": "/brands/new-balance.svg",
  "new-balance": "/brands/new-balance.svg",
  "newbalance": "/brands/new-balance.svg",
  "the north face": "/brands/the-north-face.svg",
  "the-north-face": "/brands/the-north-face.svg",
  "thenorthface": "/brands/the-north-face.svg",
  "north face": "/brands/the-north-face.svg",
  "columbia": "/brands/columbia.svg",
  "patagonia": "/brands/patagonia.svg",
  "levi's": "/brands/levis.svg",
  "levis": "/brands/levis.svg",
  "calvin klein": "/brands/calvin-klein.svg",
  "calvin-klein": "/brands/calvin-klein.svg",
  "ck": "/brands/calvin-klein.svg",
  "tommy hilfiger": "/brands/tommy-hilfiger.svg",
  "tommy-hilfiger": "/brands/tommy-hilfiger.svg",
  "hugo boss": "/brands/hugo-boss.svg",
  "hugo-boss": "/brands/hugo-boss.svg",
  "boss": "/brands/hugo-boss.svg",
  "ralph lauren": "/brands/ralph-lauren.svg",
  "ralph-lauren": "/brands/ralph-lauren.svg",
  "polo ralph lauren": "/brands/ralph-lauren.svg",
  "zara": "/brands/zara.svg",
  "h&m": "/brands/hm.svg",
  "hm": "/brands/hm.svg",
  "handm": "/brands/hm.svg",
  "uniqlo": "/brands/uniqlo.svg",
  "diesel": "/brands/diesel.svg",
  "timberland": "/brands/timberland.svg",
  "mango": "/brands/mango.svg",
  "jack & jones": "/brands/jack-and-jones.svg",
  "jack-and-jones": "/brands/jack-and-jones.svg",
  "jack and jones": "/brands/jack-and-jones.svg",
  "walmart": "/brands/walmart.png",
  "decathlon": "/brands/decathlon.png",
  "u.s. polo assn.": "/brands/us-polo-assn.png",
  "u.s. polo assn": "/brands/us-polo-assn.png",
  "us polo assn": "/brands/us-polo-assn.png",
  "us-polo-assn": "/brands/us-polo-assn.png",
  "armani exchange": "/brands/armani-exchange.png",
  "armani-exchange": "/brands/armani-exchange.png",
  "a|x": "/brands/armani-exchange.png",
  "united colors of benetton": "/brands/united-colors-of-benetton.png",
  "united-colors-of-benetton": "/brands/united-colors-of-benetton.png",
  "benetton": "/brands/united-colors-of-benetton.png",
  "banana republic": "/brands/banana-republic.png",
  "banana-republic": "/brands/banana-republic.png",
  "5.11": "/brands/5-11.png",
  "5-11": "/brands/5-11.png",
  "jack wolfskin": "/brands/jack-wolfskin.png",
  "jack-wolfskin": "/brands/jack-wolfskin.png",
  "m&s": "/brands/m-and-s.png",
  "m-and-s": "/brands/m-and-s.png",
  "marks & spencer": "/brands/m-and-s.png",
  "esmara": "/brands/esmara.png",
  "g-star raw": "/brands/g-star-raw.png",
  "g-star-raw": "/brands/g-star-raw.png",
  "g star raw": "/brands/g-star-raw.png",
  "next": "/brands/next.png",
  "esprit": "/brands/esprit.png",
  "lee": "/brands/lee.png",
  "guess": "/brands/guess.png",
  "ovs": "/brands/ovs.png",
  "primark": "/brands/primark.png",
  "arc'teryx": "/brands/arcteryx.png",
  "arcteryx": "/brands/arcteryx.png",
  "carhartt": "/brands/carhartt.png",
  "kappa": "/brands/kappa.png",
  "pvh": "/brands/pvh.png",
  "salomon": "/brands/salomon.png",
};

/**
 * Resolves the authentic brand logo asset path for a given brand name and explicit logo.
 * Follows Rule 92: The admin-uploaded logo is authoritative.
 */
export function getBrandLogoUrl(brandName?: string, explicitLogo?: string): string | null {
  if (
    explicitLogo &&
    explicitLogo.trim() !== "" &&
    !explicitLogo.includes("placeholder") &&
    !explicitLogo.includes("/brands/generic.png")
  ) {
    return explicitLogo.trim();
  }
  if (!brandName) return null;
  const key = brandName.toLowerCase().trim();
  if (BRAND_LOGO_MAP[key]) {
    return BRAND_LOGO_MAP[key];
  }
  const slug = key.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (BRAND_LOGO_MAP[slug]) {
    return BRAND_LOGO_MAP[slug];
  }
  return null;
}

