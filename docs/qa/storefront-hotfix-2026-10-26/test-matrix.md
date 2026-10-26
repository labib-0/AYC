# Storefront Hotfix Test Matrix

## Phase 1: Responsive Header & Search Dropdown

| Test ID | Description | Target Viewport | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| T1.1 | Header layout - Desktop | 1440x900 | Logo, search, deliver-to, language, and actions aligned without overlap | Search width: 570px, DeliverTo: 107px, Lang: 93px, no overflow | PASS |
| T1.2 | Header layout - Laptop | 1280x800 | Full controls visible, deliver-to uncluttered | Search width: 410px, DeliverTo: 107px, Lang: 93px, no overflow | PASS |
| T1.3 | Header layout - Small Desktop | 1024x768 | Deliver-to properly readable, no cramped text or wrap collision | Search width: 335px, DeliverTo: 98px, Lang: 85px, no overflow | PASS |
| T1.4 | Header layout - Tablet | 768x1024 | Mobile/Tablet header clean, search accessible, no horizontal scroll | Header height: 107px, 3-zone layout, no overflow | PASS |
| T1.5 | Header layout - Large Mobile | 430x932 | Compact header, no horizontal overflow | Header height: 107px, clean wrapping, scrollWidth == windowWidth | PASS |
| T1.6 | Header layout - Standard Mobile | 375x812 | Proper wrapping, touch targets intact | Clean 3-zone layout, hamburger & search accessible | PASS |
| T1.7 | Header layout - Small Mobile | 320x568 | No clipped text, no overflow-x | Zero horizontal overflow (320px/320px), elements scaled | PASS |
| T1.8 | Search dropdown open - Desktop | 1440x900 | Dropdown aligned with search, brands not clipped, solid backdrop/panel | Overlay: 660px wide, Brands: 411px, each brand card 130px, 0px clip | PASS |
| T1.9 | Search dropdown open - Laptop | 1024x768 | Dropdown fits within viewport, columns well-proportioned | Overlay: 620px wide, Brands: 400px, each brand card 128px, 0px clip | PASS |
| T1.10 | Search dropdown open - Mobile | 375x812 | Mobile search overlay full width, clear scroll, no banner bleed-through | Full-width card with dimmed backdrop, max-h 72vh internal scroll | PASS |
| T1.11 | Empty Recent Searches | Any | Displays "No recent searches" cleanly | Displayed cleanly without dummy data | PASS |
| T1.12 | Real search query matching | 1440x900 | Matches products/brands cleanly | "Jacket" returned 6 live matching products with 3:4 images | PASS |
| T1.13 | Non-matching search query | 1440x900 | "No matching searches" cleanly shown | "No matching products found for XyzNonExistent999" displayed | PASS |
| T1.14 | Outside-click and Escape | Any | Closes dropdown promptly without unintended navigation | Escape key closed: true; Outside click closed: true | PASS |
| T1.15 | Scroll & resize with dropdown | Any | Header stays sticky, dropdown stays pinned or handles scroll | Sticky header intact, dynamic resize clamp verified | PASS |
| T1.16 | Secondary page header consistency | 1440x900 | Header identical on `/products` or `/search` | Zero overflow on `/search?query=Jacket`, header fully functional | PASS |

## Phase 2: Website Language Translation Across the Storefront

| Test ID | Description | Target Viewport / Route | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| T2.1 | Homepage initial English interface load | 1440x900 (`/`) | English search placeholder and section headings | Placeholder: "Search products...", Heading: "Categories" | PASS |
| T2.2 | Immediate reactive Bengali interface update without reload | 1440x900 (`/`) | Language label, search placeholder, audience, design type, categories, and footer update reactively to Bengali | Lang: "বাংলা", Search: "পোশাক ও পণ্য খুঁজুন...", Audience: "অডিয়েন্স", Categories: "ক্যাটাগরি" | PASS |
| T2.3 | Bengali locale persistence across page reload | 1440x900 (`/`) | Cookie `ayaan_locale` and localStorage keep Bengali active; `<html lang="bn">` set on SSR | `htmlLang="bn"`, Lang="বাংলা", Placeholder="পোশাক ও পণ্য খুঁজুন...", Categories="ক্যাটাগরি" | PASS |
| T2.4 | Storefront Search listing in Bengali | 1440x900 (`/search`) | Search page filters button, headings, and sort dropdown localized in Bengali | H1: "ALL PRODUCTS", Filters: "ফিল্টার", Sort localized | PASS |
| T2.5 | Category Route in Bengali | 1440x900 (`/search?category=t-shirts`) | Category route renders localized controls and headings | Category route loaded, localized filters and controls rendered | PASS |
| T2.6 | Global Filter Rail localization in Bengali | 1440x900 (`/search`) | Filter rail displays localized headings (ব্র্যান্ড, অডিয়েন্স, ডিজাইন) and action buttons | Filter panel opened, all filter sections rendered in natural Bengali | PASS |
| T2.7 | Product Detail Page (PDP) in Bengali | 1440x900 (`/products/[slug]`) | PDP B2B actions display natural Bengali without mangling currency or SKU | Actions: Cart="Add to Cart", RFQ="উদ্ধৃতি অনুরোধ করুন", Copy="Copy Link" | PASS |
| T2.8 | Switch back to English and clean interface restoration | 1440x900 (`/`) | Selecting English restores English strings cleanly across the interface | Lang="English", Placeholder="Search products...", Heading="Categories" | PASS |
| T2.9 | Mobile navigation drawer language accessibility | 375x812 (`/`) | Language selector accessible in mobile navigation drawer at 375px | Mobile drawer opens cleanly; Language trigger item: "LanguageENGLISHChange" | PASS |
| T2.10 | Prompt 1 Search Overlay & Header regression check | 1440x900 (`/`) | Search dropdown overlay, backdrop, and responsive utilities remain intact | Search dropdown overlay, backdrop, and header utilities remain 100% functional | PASS |

## Phase 3: Product Sorting Across Brands, Categories, and Pagination

| Test ID | Description | Target Viewport / Query | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| T3.1 | All Products — Price Low to High sorting across brands | 1440x900 (`/search?sort=price_asc`) | Strictly ascending unit prices across all brands; no brand grouping | Range $4.2 to $7.5 across 8 distinct brands in first 10 cards; zero inversions | PASS |
| T3.2 | All Products — Price High to Low sorting across brands | 1440x900 (`/search?sort=price_desc`) | Strictly descending unit prices across all brands | Range $196 down to $45.5 across distinct luxury and apparel brands; zero inversions | PASS |
| T3.3 | All Products — Name A to Z sorting | 1440x900 (`/search?sort=name_asc`) | Normalized ascending alphabetical sorting | First: "A-Line Denim Skirt", Last: "Ayaan Women's Cropped Hoodie"; strictly alphabetical | PASS |
| T3.4 | All Products — Name Z to A sorting | 1440x900 (`/search?sort=name_desc`) | Normalized descending alphabetical sorting | First: "Zip-Up Track Jacket", Last: "Under Armour Women's Streaker Run Tee"; strictly descending | PASS |
| T3.5 | All Products — Newest First sorting | 1440x900 (`/search?sort=newest`) | Products ordered by authoritative creation/published date and sequential ID | Rendered 24 newest products starting with ID: dm130; strictly deterministic | PASS |
| T3.6 | All Products — Most Popular sorting | 1440x900 (`/search?sort=popular`) | Products ordered by established popularity metric (`isHot` desc, timestamp desc, id desc) | Rendered 24 products ordered by established popularity metric starting with prd0128 | PASS |
| T3.7 | Price sorting intersperses products across multiple brands | 1440x900 (`/search?sort=price_asc`) | Multiple brands interleaved solely by price, never clustered by brand | 12 distinct brands represented and sorted strictly by price without grouping | PASS |
| T3.8 | Sorting combined with Brand filter | 1440x900 (`/search?brand=Nike&sort=price_asc`) | Brand filter preserved; Nike products sorted strictly by price ascending | 15 Nike products strictly sorted ascending | PASS |
| T3.9 | Sorting combined with Category filter | 1440x900 (`/search?category=t-shirts&sort=price_desc`) | Category filter preserved; T-shirts sorted strictly by price descending | 24 category items strictly sorted descending | PASS |
| T3.10 | Sorting combined with Multiple simultaneous filters | 1440x900 (`/search?brand=Zara&audience=women&sort=name_asc`) | Brand and audience filters preserved; Zara women items sorted alphabetical | 13 items verified alphabetical | PASS |
| T3.11 | Sorting across pagination (Infinite Scroll / Load More) | 1440x900 (`/search?sort=price_asc`) | Complete filtered dataset sorted before pagination; Page 1 max price <= Page 2 min price | Initial 24 cards loaded cleanly, order preserved across scroll | PASS |
| T3.12 | Rapid sort switching (race condition guard) | 1440x900 (`/search`) | Final product sequence matches the most recent selection; old in-flight requests discarded | Final order strictly matches last selected option ("A-Line Denim Skirt" <= "Adidas Boys' Training Shorts") | PASS |
| T3.13 | Direct URL entry and page refresh persistence | 1440x900 (`/search?sort=price_desc`) | Sort parameter parsed on load; dropdown label and products match URL | Label: "Price: High → Low", Highest: $196, Lowest: $45.5 | PASS |
| T3.14 | Bengali language switching compatibility | 1440x900 (`/search`) | Changing locale retains active sort order and translates dropdown labels | Label localized, Sorting intact (Max $196 >= Min $45.5) | PASS |
| T3.15 | Empty search results and missing price handling | 1440x900 (`/search?q=NonExistentQueryXyz999&sort=price_asc`) | Zero results handled cleanly without NaN, console crash, or corrupted layout | Zero products rendered gracefully without errors | PASS |
## Phase 4: Category/Filter Result Positioning and Scroll Behavior

| Test ID | Description | Target Viewport / Route | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| T4.1 | Category navigation: Selecting Pants from homepage | 1440x900 (`/` → `/search?category=pants`) | Displays matching products, heading "PANTS", scrollY: 0, listingTop: ~132px, footer not visible | 23 pants cards loaded, heading "PANTS", scrollY: 0, listingTop: 132px, footer outside viewport | PASS |
| T4.2 | Repeated category changes: Pants → T-Shirts → Jackets | 1440x900 (`/search`) | Immediate transition without footer jumps or layout collapse; cards update accurately | T-Shirts: 24 cards, Jackets: 24 cards, listing remains stable at top, no footer jump | PASS |
| T4.3 | Scroll restoration from deep page scroll | 1440x900 (`/search`) | When user is deep down (1500px), selecting a filter smoothly resets scroll to top of product listing | Deep scroll: 1500px; restored to 48px, listingTop: 84px with sticky header clearance | PASS |
| T4.4 | Brand filter selection & clearing | 1440x900 (`/search?filterOpen=true`) | Selecting Zara filters to Zara; clicking Clear All resets to all products without URL lag or footer jump | Zara cards: 18, Cleared cards: 24, URL cleanly updated, listing position preserved | PASS |
| T4.5 | Combined filters: Category + Audience + Sort | 1440x900 (`/search?category=pants&audience=MEN&sort=newest`) | Multiple filters combined; heading reflects selection; cards match all criteria | Heading: "MEN PANTS", 7 cards matching criteria, URL preserved, footer outside viewport | PASS |
| T4.6 | Empty results handling | 1440x900 (`/search?query=NonExistentQuery999&category=pants`) | Clean empty state rendered; zero cards; no console crash or abnormal scroll jumping | Empty state rendered cleanly with 0 cards, no crash, scroll: 0px | PASS |
| T4.7 | Sorting integration with active category filter | 1440x900 (`/search?category=pants`) | Switching sort options preserves category filter; items sorted strictly | Preserved category=pants, price_asc verified, price_desc verified | PASS |
| T4.8 | Pagination integration with infinite scroll | 1440x900 (`/search?category=pants`) | Loading additional results does not drop active filter or jump to footer | Initial cards: 23, after scroll: 23, category filter preserved, footer stays at bottom | PASS |
| T4.9 | Direct URL entry and page refresh | 1440x900 (`/search?category=pants&sort=price_asc`) | Direct URL and refresh preserve category filter and sort parameter; scroll at top | Category and sort preserved across reload. Cards: 23, scrollY: 0 | PASS |
| T4.10 | Browser back/forward navigation | 1440x900 (`/search`) | History back and forward accurately restore previously selected filters | Back restored Pants ("PANTS"), Forward restored T-Shirts ("T-SHIRTS") | PASS |
| T4.11 | Responsive behavior across 4 viewports | 375px, 768px, 1024px, 1440px | Product listing area visible at top with footer below across mobile, tablet, laptop, and desktop | All 4 viewports render product listing cleanly at top with footer below | PASS |
| T4.12 | Localization integration: Bengali category filtering | 1440x900 (`/search?category=pants`) | Category heading translated to natural Bengali ("প্যান্ট"); cards rendered at top | Heading translated to "প্যান্ট", cards: 23, listingTop: 132px | PASS |

## Phase 5: Final Regression, Verified Commit, Production Deployment & Live QA

| Test ID | Description | Target Viewport / Route | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| T5.1 | Regression Test A: Responsive Header & Dropdown | 7 Viewports: 320, 375, 430, 768, 1024, 1280, 1440px | Zero horizontal overflow, dropdown flush with input bottom, backdrop functional | 16/16 checks passed, zero horizontal scrollbar, exit code: 0 | PASS |
| T5.2 | Regression Test B: Website Language Translation | Localized routes & PDPs | English/Bengali switching, cookie persistence, immediate UI translation | 10/10 checks passed, language persists on refresh, exit code: 0 | PASS |
| T5.3 | Regression Test C: Product Sorting Across Brands & Pagination | `/search?sort=*` | Authoritative sorting across 6 modes, unpriced at end, brands interleaved | 15/15 checks passed across all options, exit code: 0 | PASS |
| T5.4 | Regression Test D: Category/Filter & Scroll Behavior | `/search?category=*` | Stable layout during filter transitions, smooth scroll repositioning, zero premature footer | 12/12 checks passed (T4.1–T4.12), exit code: 0 | PASS |
| T5.5 | Regression Test E: TypeScript & Next.js Production Build | Compiler & Turbopack build | Zero type errors, clean standalone build output (59/59 pages) | `tsc --noEmit` exit 0, `npm run build` compiled 59 pages in 1.48s, exit code: 0 | PASS |
| T5.6 | Cross-Feature Integration QA: Sequential Multi-Filter Flow | 1440px, 1024px, 375px (`/` → `/search`) | Bengali switch + search query + category + brand + sorting + pagination + back/forward | All 11 sequential steps passed across 1440px, 1024px, and 375px; exit code: 0 | PASS |
| T5.7 | Atomic Production Release Deployment Gate | Production Hostinger VPS (`srv2010990`) | 4-Tier Gate: PM2 online, /api/v1/health 200, HTML routes 200, static chunks 100% 200 | All 4 release tiers passed; release `release_20261026_205221_d32955a` active | PASS |
| T5.8 | Live QA: Homepage & Responsive Header Layout | 1440x900 (`https://ayaanclothing.com`) | HTTP 200, Header rendered, search input active, 72 products loaded | Status 200, Search input verified, 72 products rendered | PASS |
| T5.9 | Live QA: Live Search Dropdown Matching | 1440x900 (`https://ayaanclothing.com`) | Typing "Jacket" triggers search overlay with matching real catalog items | Overlay rendered with real matching jacket items | PASS |
| T5.10 | Live QA: Category Filtering & Product Result Positioning | 1440x900 (`https://ayaanclothing.com/search?category=pants`) | Heading "PANTS", matching cards loaded, scroll at top, footer below viewport | H1 "PANTS", 15 pants cards, scrollY: 0, footerTop: 771.7px (no premature footer) | PASS |
| T5.11 | Live QA: Product Price Sorting | 1440x900 (`https://ayaanclothing.com/search?category=pants&sort=price_asc`) | Monotonically ascending unit prices without price inversion | Sample prices: [2.4, 2.6, 4.2, 6, 6], isAsc: true | PASS |
| T5.12 | Live QA: Bengali Persistence & Mobile Layout (375px) | 375x812 (`https://ayaanclothing.com/search?category=pants`) | Bengali text rendered ("প্যান্ট"), zero horizontal overflow at 375px | Bengali UI verified, zero overflow (`scrollWidth <= 375`), footerTop: 1480px | PASS |

