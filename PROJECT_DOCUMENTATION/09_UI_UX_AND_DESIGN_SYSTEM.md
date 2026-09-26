# 09 — UI/UX & Design System Architecture

## 1. Design Philosophy & Aesthetic Identity

The Ayaan Clothing design system combines modern international high-fashion minimalism with clean industrial B2B data density. It avoids generic consumer palettes in favor of refined neutral tones, rich contrast, subtle glassmorphism, micro-animations, and structured data hierarchy.

---

## 2. Layout Structure & Breakpoint Architecture

| Viewport Tier | Breakpoint (px) | Grid Columns | Max Container Width | Typical Navigation |
|---|---|---|---|---|
| **Mobile (Compact)** | `< 640px` | 1–2 Columns | `100%` (Padding: `16px`) | Bottom bar + Drawer Menu |
| **Tablet** | `640px – 1023px` | 2–3 Columns | `100%` (Padding: `24px`) | Collapsible Header |
| **Desktop (Standard)** | `1024px – 1439px` | 4 Columns | `1400px` (`max-w-7xl`) | Sticky Header + Dropdown Rails |
| **Admin Wide Screen** | `≥ 1440px` | 4–6 Columns | `1600px` (`max-w-[1600px]`) | Fixed Sidebar (256px) + Main View |

---

## 3. Typography System

The application imports two specialized Google Font families configured in `src/app/layout.tsx`:

```tsx
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});
```

| Type Category | Font Family | Variable | Usage in Application |
|---|---|---|---|
| **Body & UI Interface** | Inter | `var(--font-inter)` (`font-sans`) | Body text, forms, table data, navigation links, filters |
| **Display & Editorial** | Manrope | `var(--font-manrope)` (`font-display`)| Hero headlines, section titles, product names, modal headers |
| **Technical / Monospace**| Standard System Mono | `font-mono` | Order numbers (`ORD-2026-XXXX`), SKUs, SWIFT codes, tracking IDs |

### Scale & Hierarchy
- **Hero Title**: `text-4xl sm:text-5xl lg:text-6xl`, `font-extrabold`, `font-display`, `tracking-tight`
- **Section Heading**: `text-xl sm:text-2xl lg:text-3xl`, `font-bold`, `font-display`, `uppercase`
- **Card Title**: `text-sm sm:text-base`, `font-semibold`, `text-foreground`
- **Meta / Labels**: `text-xs sm:text-[13px]`, `font-medium`, `text-muted-foreground`
- **Micro Badges**: `text-[10px] sm:text-[11px]`, `font-bold`, `uppercase`, `tracking-wider`

---

## 4. Color Palette & Theming Tokens

Tailwind CSS v4 tokens are configured using modern CSS variables with dark mode support:

```css
:root {
  --background: 0 0% 100%;       /* Pure white base */
  --foreground: 224 71% 4%;      /* Deep midnight ink */
  --card: 0 0% 100%;             /* Card white */
  --card-foreground: 224 71% 4%;
  --primary: 221 83% 53%;        /* Ayaan Royal Cobalt Blue */
  --primary-foreground: 210 40% 98%;
  --secondary: 220 14% 96%;      /* Soft neutral slate */
  --secondary-foreground: 220 9% 46%;
  --muted: 220 14% 96%;
  --muted-foreground: 220 9% 46%;
  --accent: 220 14% 96%;
  --accent-foreground: 220 9% 46%;
  --destructive: 0 84% 60%;      /* Vivid red error */
  --destructive-foreground: 210 40% 98%;
  --border: 220 13% 91%;         /* Subtle hairline borders */
  --ring: 221 83% 53%;
  --radius: 0.85rem;             /* 14px modern rounded corners */
}
```

---

## 5. Garment Image 4:5 Aspect Ratio Standard

In accordance with international fashion and apparel export photography standards, all garment cards, category tiles, and gallery viewers strictly enforce a **4:5 aspect ratio**:
- **Tailwind Class**: `aspect-4/5` or `aspect-[4/5]`.
- **CSS Rule**: `aspect-ratio: 4 / 5; object-fit: cover; object-position: top center;`.
- **Why It Matters**: Prevents horizontal distortion of mannequin and model garments, ensures vertical fabric hang is accurately displayed, and maintains uniform grid rhythm regardless of uploaded image dimensions.

---

## 6. Interactive States & Micro-Interactions

### 6.1 Loading States & Skeletons
Components never show blank screens or unstyled text shifts during data acquisition.
- `ProductCardSkeleton.tsx`: Renders 4:5 pulse placeholder, title bar pulse, and price badge shimmer.
- Admin table skeletons render pulsed rows matching exact column widths.

### 6.2 Empty States
When database collections are empty, components render contextual SVG illustrations with clean explanatory copy and primary action links:
- Zero Brands: *"No brands yet — Contact administrative merchandiser"*.
- Zero Search Results: *"No garment styles match your filter criteria — Reset Filters"*.
- Zero Orders: *"No wholesale orders recorded — Browse Catalog"*.

### 6.3 Focus & Accessibility (a11y)
- All interactive inputs feature explicit focus rings (`focus:ring-2 focus:ring-primary/40 focus:outline-none`).
- High-contrast color pairings satisfying WCAG 2.1 AA ratios.
- Semantic HTML elements (`<header>`, `<main>`, `<nav>`, `<aside>`, `<footer>`, `<section>`).
