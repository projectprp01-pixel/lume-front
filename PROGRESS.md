# inStay Guest App — Progress & Project Memory

_Evolve Back / inStay guest app — React + TypeScript + Vite. Last updated: 2026-10-04._

Live: **https://figma-stuff.vercel.app** (deep links: `/#/experiences`, `/#/dining`, `/#/requests`)

---

## 1. What this project is

A guest-facing "in-stay" app for the **Evolve Back** resort brand, built design-to-code from Figma. Four top-level tabs make up the in-stay experience: **Home, Experiences, Dining, Requests**. Each screen is responsive — a mobile layout and a laptop/web layout in one component.

## 2. Figma source (important)

| File | fileKey | Use it? |
|---|---|---|
| **Lume EB Theme (Copy)** | `oi7RyytKaEidx7yeadnPHV` | ✅ **Yes** — Pro team (no paywall), has both mobile + web canvases, node IDs match the original |
| Lume EB Theme (original) | `8zg1POFUkLNH7fo11Ff1FS` | ❌ Starter team — Figma MCP reads hit a hard rate-limit paywall |
| DEVANSHI's dup | `4LHSMGFahLsyt8TFBYHnIR` | ⚠️ Pro but **missing** the Web Designs canvas (mobile only) |

**Design roots** (identical node IDs across the original and the working copy):
- **Mobile** = page `0:1` ("All Screens")
- **Web/laptop** = node `44:1658` ("Web Designs")
- Design System page = `10:400`

**Primary frames built:**

| Screen | Mobile node | Web node |
|---|---|---|
| Experiences | `1957:16737` (Experiences- All) | `3056:18830` |
| Dining | `397:5841` (Dining) | `3132:20458` |
| Requests | `1822:12947` (Requests- sent) | `3132:24281` (Requests- sent alt) |
| Bottom nav component | `279:3159` | — |

> **Figma plan gotcha:** the MCP quota is billed to the **team that owns the file**, not your account. Your account (`projectprp01@gmail.com`) is Pro, but the original file lives in a Starter team, so its reads were paywalled. The Copy lives in a Pro team, which unblocked everything. This Starter cap is the likely reason some web detail was missing in earlier builds (truncated design-context pulls / incomplete asset downloads).

## 3. Build conventions

- **One responsive component per screen** in `src/screens/<name>/<Name>.tsx`, handling mobile + laptop via a `@media (min-width: 1024px)` block in a sibling `.css`. Mobile-first.
- **Data-driven:** content lives in `src/screens/<name>/<name>Data.ts` and is `.map()`-ed in the component.
- **Design tokens** in `src/styles/tokens.css` (colors, 4pt spacing, type scale, radius). Never hardcode a value that exists as a token. Global reset + `.app-shell` (caps mobile at 640px, full width ≥1024) in `src/styles/global.css`.
- **BEM-ish, screen-prefixed class names** to avoid collisions (`.exp-tile`, `.dining-band`, `.request-card`).
- **Assets** per screen under `src/assets/<name>/`; no leftover Figma URLs. Fonts: `--font-display` = Jazmin/Cormorant serif, `--font-body` = Inter.

## 4. Architecture

- **Navigation** — lightweight, no router. `src/navigation/NavContext.tsx` holds the current `Screen` and syncs to the URL hash (`#/dining`) for deep-linking + browser back/forward (`hashchange` listener). `App.tsx` renders the matching screen inside `.app-shell`.
- **Shared chrome** in `src/components/`:
  - `ScreenChrome` — wraps `MobileTopBar` + `DesktopNav` + children + `BottomNav`
  - `ScreenTitle` — back arrow + heading
  - `MobileTopBar` — translucent notifications / logo / profile bar (mobile)
  - `DesktopNav` — dark link bar with Home/Experiences/Dining/Requests (laptop)
  - `BottomNav` — mobile tab bar; icons inlined via `?raw` + `fill → currentColor` so active/inactive tint is CSS-driven (CSS `mask-image` rendered as squares in headless Chrome, so it was replaced)
- All `.topnav*` styles centralized in `src/components/nav.css` (removed from `Home.css`).

## 5. Status — screens

| Screen | Mobile | Laptop | Notes |
|---|---|---|---|
| **Home** | ✅ | ✅ | Pre-existing; refactored onto shared nav + bottom nav |
| **Experiences** | ✅ list + filter chips | ✅ 3-col grid | — |
| **Dining** | ✅ hero, scroll rows, dark band | ✅ hero banner, 2-up + 4-up grids | — |
| **Requests** | ✅ cards, progress tracker, composer | ✅ centered column | — |
| Profile / Notifications | — | — | Exist in Figma, **out of the 4-tab in-stay scope** (not built) |

Verification: `npx tsc --noEmit` ✅ and `npm run build` ✅. All screens screenshotted at true mobile (390px) and laptop (1440px) and checked against the Figma frames. Reference shots in `.figma-ref/verify/`.

## 6. How to verify screens (no Playwright installed)

System Chrome is at `/c/Program Files/Google/Chrome/Application/chrome.exe`. `npm run build` then `npm run preview`.

- **Gotcha:** `chrome --headless --screenshot --window-size=390,H` does **not** give a true 390px viewport — headless clamps the window to ~512px min width, rendering at 512 but cropping to 390 (false "overflow"). Confirm real overflow via `document.documentElement.scrollWidth` vs `innerWidth` first.
- **Correct approach:** CDP device emulation (Node 24 has global `fetch` + `WebSocket`): launch `chrome --headless=new --remote-debugging-port=PORT about:blank`, fetch `http://localhost:PORT/json` for the `webSocketDebuggerUrl`, then per screen `Emulation.setDeviceMetricsOverride {width:390,height:844,deviceScaleFactor:2,mobile:true}` → `Page.navigate` (hash nav works via the `hashchange` listener) → `Page.captureScreenshot {captureBeyondViewport:true}`. Screenshot paths passed to Chrome must use **forward slashes** (MSYS mangles `\\`).

## 7. Deployment

- Hosted on **Vercel**, project `figma-stuff` (linked via `.vercel/project.json`), framework Vite, SPA rewrite to `/index.html` in `vercel.json`.
- Redeploy to production: `npx vercel deploy --prod --yes` (CLI authed as `tusharshetty61`).
- Production alias: **https://figma-stuff.vercel.app**

## 8. Not using git

The working directory is **not** a git repo (intentionally — per request, git commit/push was skipped). Deploys go straight from local source via the Vercel CLI.

## 8b. Backend integration (lume-backend)

The app now pulls live data from **lume-backend** (`C:\Users\tshetty\code\lume-backend`). Deployed
API: `https://lume-backend-production-f3de.up.railway.app` (CORS already allows `localhost:5173`).

**The app is gated behind a valid booking token.** Opening it without `?token=` (or with an
invalid/expired one) renders `src/screens/InvalidPage.tsx` ("Invalid page" / "This link is no longer
valid") — no app content, no catalog. Only a resolved token renders the tabs. The static `*Data.ts`
files remain only as transient fallbacks for a single failed API call while a valid token is active.

**Stay-phase routing (date-only).** Once the token resolves, `AppGate` in `App.tsx` picks the landing
flow from the booking dates (`stayPhase()`, time-of-day ignored):
- `today < arrivalDate` → **pre-stay**: lands on `splash` → online `checkin` flow.
- `arrivalDate ≤ today ≤ checkoutDate` → **in-stay**: lands on `home` (the tabs).
- `today > checkoutDate` → **post-checkout**: `InvalidPage` ("This link is no longer valid").

`NavProvider` takes a `defaultScreen` prop set from the phase; the URL hash still overrides it for
deep-links, and `navigate()` is unrestricted so the check-in CTA ("Continue to WebApp") still works.

**Pre-stay = online check-in flow only.** Pre-stay lands on `Splash` → `CheckIn`. The invitation
email (`PreArrivalEmail`) is only a *reference* for the mail the guest receives — it has been
**removed from the app's routing** (no `email` screen, not reachable at `#/email`). The component
file is kept as a design reference but is never rendered.

**Check-in is fully wired (read + write).** `CheckIn.tsx` pre-fills the primary guest and person
count from the token's guest/booking, reflects saved progress via `GET /api/checkin/by-guest`, and
the modal does a **real ID upload to Cloudflare R2**: `POST /api/checkin/initialize` (creates the
session) → `POST /:checkInId/upload-id` (multipart `idFront`/`idBack` — the backend switched from
Cloudinary to **R2**, see `utils/r2Upload.js`) → `POST /:checkInId/complete` on "Continue to WebApp".
`api/client.ts` skips the JSON content-type for `FormData` so multipart boundaries are set by the
browser.

**Upload size caps are per-type:** images ≤10 MB, PDFs ≤15 MB (jpg/png/heic/webp/pdf). multer's single
`fileSize` is set to the 15 MB ceiling and the per-type split is enforced in `checkin.controller.js`;
the frontend mirrors it in `CheckIn.tsx`. Each person is a separate upload request, so the cap is
**per file**, not aggregate. Large raster images are **downscaled client-side** before upload
(`api/image.ts` — canvas, no deps, longest side ≤2400 px, JPEG quality step-down) so phone photos
rarely hit the cap and upload faster; PDFs/HEIC pass through untouched and rely on the cap.

The backend caps are **deployed** — committed as "improve upload limits" on `lume-backend` `main`
(`middleware/upload.js` 15 MB ceiling + per-type split in `checkin.controller.js`) and live on Railway.

**Today's Plan (Home) is live.** Aggregates the guest's own experience + spa + dining bookings that
fall on **today** (`GET /experiences/bookings/guest/:id`, `/guests/spa/bookings/guest/:id`,
`/guests/dining/reservations/guest/:id`), sorted by slot time, with done/now/upcoming status derived
from the current time. The section is **hidden when there's nothing today** (no fake static).

**Notifications** support **mark-as-read** (tap a card → `PUT /guests/notifications/:id/read`) and
**mark all read** (`PUT /guests/:guestId/notifications/read-all`), with an unread dot + tint.

> Remaining static (no clean backend source): Profile **outstanding balance** (no guest-facing folio
> endpoint), Home **quick actions / Ayurveda / Loyalty / Gallery** banners, and the **in-room dining**
> hero on Dining. These are presentational; everything data-backed is wired.

- **Config:** `VITE_API_URL` in `.env` = deployed backend base URL (no `/api` suffix). `.env.example` committed.
- **API layer** `src/api/`: `client.ts` (fetch wrapper, unwraps the `{success,data}` envelope),
  `types.ts` (backend DTOs), `endpoints.ts` (typed calls), `useFetch.ts` (loading/error/refetch hook),
  `format.ts` (price/date/hours formatters).
- **Identity** `src/guest/GuestContext.tsx`: reads `?token=` (Guest.bookingToken), persists to
  localStorage, resolves it via `GET /api/checkin/booking/:token` → `{ guest, booking }`. `guest.id`
  is the `guestId` every per-guest call uses. Bad/expired token is dropped → app falls back to catalog.
- **Wired screens:**
  - Experiences → `GET /api/experiences` (chips derived from live categories, client-side filter)
  - Dining → `GET /api/guests/restaurants/all`, split by `facilityType` (restaurant / intimate_dining)
  - Home → stay header from the resolved booking + `GET /api/experiences/spotlight`
  - Requests → `GET/POST /api/guests/requests` (composer submits + refetches; needs token)
  - Notifications → `GET /api/guests/:guestId/notifications`
  - Profile → guest from token + `GET /api/experiences/bookings/guest/:guestId` (outstanding balance
    has no guest endpoint yet, so it stays on the sample value)
- **In-room dining hero, quick actions, Today's Plan, gallery, loyalty** remain static (no clean
  backend source yet).

## 9. Possible next steps

- Build **Profile** and **Notifications** screens if they should join the app.
- Reconcile the **Home web frame** against Figma to fix any detail approximated before the Pro-quota file was available.
- Wire the filter chips / composer / "See Price Sheet" to real behavior (currently presentational).
