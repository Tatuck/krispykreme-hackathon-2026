# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Hackathon demo for Krispy Kreme Madrid: a loyalty + referral web app whose goal is to make one-time buyers come back and to sell **boxes** rather than single doughnuts. All code lives in `web/` (Next.js 16 App Router, React 19, Tailwind v4, Drizzle ORM on libSQL/SQLite, Resend for email). `web/README.md` has the demo script and deploy notes.

## Commands (run from `web/`)

```bash
npm run dev -- -H 0.0.0.0        # dev server, reachable from LAN/Tailscale
npm run build && npx next start -H 0.0.0.0 -p 3000   # production (used for the live demo)
npm run db:push                  # apply src/db/schema.ts to DATABASE_URL (drizzle-kit push --force, no migrations)
npm test                         # vitest, src/**/*.test.ts
npx vitest run -t "referral"     # single test by name
npm run typecheck
npx eslint src
```

Store/admin PIN is `STAFF_PIN` (default `1234`, public); the secret `ADMIN_PIN` adds the owner role, the only one allowed to wipe data on the public demo (`canWipeData`). Env vars are documented in `.env.example`; `.env.local` holds the real Resend key.

## Next.js 16 caveat

`web/AGENTS.md` (auto-written by `next dev`): this Next.js version has breaking changes vs. training data — read `web/node_modules/next/dist/docs/` before using unfamiliar APIs. In this project specifically:
- `cacheComponents` is deliberately **disabled** in `next.config.ts`; pages are DB/cookie-dynamic and use `export const dynamic = "force-dynamic"` where needed.
- `params`/`searchParams` are Promises; route handlers type their context with the global `RouteContext<"/path/[x]">`.
- Tailwind v4: custom classes like `btn`, `card`, `input`, `h-display` are defined with `@utility` in `src/app/globals.css` (not `@layer components`, which can't be `@apply`-composed).

## Architecture

**Domain logic is centralized in `src/lib/loyalty.ts`** (server-only); pages and server actions are thin wrappers around it. Key flows:
- `claimTicket` — a ticket is one in-store sale; its QR (`/t/[code]`) is claimed once via a conditional `UPDATE … WHERE claimed_at IS NULL`. Claiming applies the purchase (unless the cashier already linked it to a member) and spins the wheel only if the ticket has a box **or** it's the customer's first visit.
- Tickets store `items` (JSON `CartLine[]`) plus derived `boxes`/`units`; old tickets have `items = []` and render from boxes/units.
- `applyPurchase` — visits, boxes, stamps (5 → free box), and referral conversion on the friend's **first box**, which triggers `rewardInviter` (doughnut per friend, ×2 if the inviter holds an active `DOUBLE_REFERRAL`, free dozen every 3rd conversion).
- `runDailyJob` — expires gifts, rescores everyone, sends birthday and win-back campaigns. Called by `/api/cron/daily` (Vercel cron, `CRON_SECRET`) and the admin Demo tab.

**Pure rule modules** (importable from client components and tests): `src/lib/gifts.ts` (gift catalog with ES/EN copy, colors, validity, wheel weights, `pickWeighted`, birthday rule constants) and `src/lib/scoring.ts` (0–100 score = recency 30 + frequency 25 + boxes 20 + email engagement 15 + referrals 10; tiers original <40 ≤ chocolate <75 ≤ gold; win-back thresholds; referral ladder; stamps). Business-rule changes belong here and are covered by `src/lib/__tests__/`.

**Demo clock**: `lib/clock.ts` `now()` = real time + `clockOffsetDays` setting. Always use `await now()` (not `Date.now()`) for anything stored or compared in the DB so admin "time travel" works. All timestamps are epoch ms integers.

**Public demo caps** (`lib/limits.ts`): with `NEXT_PUBLIC_DEMO_MODE=1`, `hasRoom(table)` refuses new customers/tickets/emails/pre-orders over `DEMO_MAX_*`; `/api/cron/daily` resets + reseeds when `isDbFull()`. Call `hasRoom` before any new insert path that visitors can trigger.

**Settings** (`lib/settings.ts`) are a JSON key/value table: `wheelWeights`, `clockOffsetDays`.

**Email** (`lib/email/`): `templates.ts` renders table-based HTML per `EmailKind` and locale; `send.ts` inserts the `emails` row first (to get an id), renders with click-tracking (`/api/e/c/[id]`) and open-pixel (`/api/e/o/[id]`) URLs, then sends via Resend. Marketing kinds (birthday, winback, tier_up) are skipped without consent. Addresses ending in `@example.com` (seed data) are never sent. Opens/clicks feed the score via `lib/tracking.ts`.

**Auth** (`lib/auth.ts`): stateless HMAC-signed tokens (`AUTH_SECRET`) — customer session cookie, 7-day magic-link token (`/auth/[token]`), and staff cookie set by PIN (`sub` = `staff` | `owner`). On the public demo `AUTH_SECRET` is required (the dev fallback is public). Cookie `secure` flag follows the actual base URL protocol so plain-HTTP access over a Tailscale IP works.

**Base URL** (`lib/url.ts`): `APP_URL` env if set, else request host/forwarded headers. Used for QR codes and email links; currently set to the Tailscale IP for the demo.

**i18n**: no library. `lib/i18n/dict.ts` holds `es` (source of truth for the `Dict` type) and `en`; locale is the `lang` cookie (default `es`). Server code uses `getT()`, client components `useT()` from `I18nProvider` in the root layout. Gift copy lives in `GIFTS` in `gifts.ts`, not in the dict.

**Routes**: customer — `/`, `/t/[code]` (ticket claim + wheel), `/r/[code]` (referral landing), `/me` (wallet), `/login`; staff — `/staff` (kiosk `Kiosk.tsx`: product catalog `PRODUCTS` in `pricing.ts`, customer QR lookup → rewards, live client-side quote with `quoteSale` re-checked server-side on charge; gifts are only redeemed through a sale, 0 € allowed; printable `/staff/ticket/[code]`); admin — `/admin/*` (dashboard, customers, referrals, emails, wheel odds, pre-orders, demo clock/seed). Staff and admin share the PIN guard (`requireStaff` / `isStaff` in each server action).

**DB**: `src/db/schema.ts` (customers, tickets, gifts, referrals, emails, preorders, settings); `src/db/index.ts` creates a cached libSQL client — `file:local.db` locally, Turso URL in production (Vercel can't write SQLite files). `lib/seed.ts` creates 40 fake customers; `resetAllData` wipes everything.

## Gotchas

- `/t/[code]` must keep rendering `ClaimFlow` when the ticket was just claimed by the current session: setting the session cookie in the server action refreshes the route, and swapping the tree would lose the wheel result.
- Wheel SVG coordinates are rounded in `polar()` to avoid server/client hydration mismatches; the final angle is derived deterministically from the gift type (no state/random in render).
- Brand: keep the official krispykreme.es tokens (`kk-green #006939`, `kk-red #cc112c`, `kk-cream #fdf4eb`), heavy uppercase headings (`h-display`) with italic serif accents (`kk-script`), and `public/kk-logo.png`.
- Chart colors (admin): green/orange pair was validated for color-blind safety; orange bars carry value labels.
