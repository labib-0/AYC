/**
 * 403 Forbidden — Regional Access Restriction Page
 *
 * Standalone HTML markup returned directly by Next.js proxy for restricted regions (Bangladesh).
 * Reuses the official minimal design from public/403_geo_restricted.html with zero dependencies.
 */
export const GEO_BLOCKED_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>403 Forbidden — Regional Access Restricted | Ayaan Clothing</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #060a14;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    body::before {
      content: '';
      position: fixed;
      top: 50%;
      left: 50%;
      width: 600px;
      height: 400px;
      background: radial-gradient(ellipse, rgba(248, 113, 113, 0.025) 0%, transparent 70%);
      transform: translate(-50%, -50%);
      pointer-events: none;
    }

    .card {
      position: relative;
      background: rgba(14, 22, 40, 0.7);
      backdrop-filter: blur(20px) saturate(130%);
      -webkit-backdrop-filter: blur(20px) saturate(130%);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 18px;
      max-width: 520px;
      width: 100%;
      padding: 2.5rem 2.5rem 2.25rem;
      text-align: center;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5), 0 0 80px rgba(248, 113, 113, 0.03);
    }

    .card::before {
      content: '';
      position: absolute;
      top: 0; left: 24px; right: 24px;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: rgba(248, 113, 113, 0.08);
      border: 1px solid rgba(248, 113, 113, 0.18);
      padding: 0.3rem 0.85rem;
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      border-radius: 9999px;
      color: #f87171;
      margin-bottom: 1.75rem;
      box-shadow: 0 0 16px rgba(248, 113, 113, 0.06);
    }
    .badge svg {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
    }

    h1 {
      font-size: 1.65rem;
      font-weight: 800;
      line-height: 1.35;
      letter-spacing: -0.025em;
      color: #ffffff;
      margin-bottom: 0.9rem;
    }
    h1 .accent {
      color: #f87171;
    }

    .description {
      color: #6b7a94;
      font-size: 0.84rem;
      line-height: 1.7;
      max-width: 380px;
      margin: 0 auto 1.75rem;
    }

    .separator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
    }
    .separator .line {
      width: 40px;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(248, 113, 113, 0.25), transparent);
    }
    .separator .dots {
      display: flex;
      gap: 5px;
    }
    .separator .dot {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: rgba(248, 113, 113, 0.35);
    }

    @media (max-width: 600px) {
      .card {
        padding: 2rem 1.5rem 1.75rem;
        border-radius: 14px;
      }
      h1 { font-size: 1.35rem; }
      .description { font-size: 0.8rem; margin-bottom: 1.5rem; }
      .badge { font-size: 0.58rem; padding: 0.28rem 0.7rem; margin-bottom: 1.4rem; }
    }

    @media (max-width: 380px) {
      body { padding: 0.75rem; }
      .card { padding: 1.75rem 1.25rem 1.5rem; }
      h1 { font-size: 1.2rem; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      HTTP 403 · Regional Access Restriction
    </div>

    <h1>Ayaan Clothing Is Not<br>Available in <span class="accent">Bangladesh</span></h1>

    <p class="description">The Ayaan Clothing customer storefront is designed for international wholesale export buyers and is currently restricted in your region.</p>

    <div class="separator" aria-hidden="true">
      <div class="line"></div>
      <div class="dots">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
      <div class="line"></div>
    </div>
  </div>
</body>
</html>`;
