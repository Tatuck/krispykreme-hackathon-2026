# Krispy Kreme Madrid · Rewards (hackathon demo)

Loyalty + referral web app that turns one-time buyers into repeat **box** buyers.

- **Ticket QR → gift wheel**: every receipt has a QR. Customer enters email + date of birth, spins a box-biased wheel and gets a gift (also emailed).
- **Referrals**: friend gets 20% off their first box; inviter earns a doughnut per converted friend and a free dozen every 3.
- **Wallet** (`/me`): member card (Apple/Google Wallet mock), stamp card (5 boxes → 6th free), tier progress, gifts with QR, invite link, box pre-orders.
- **Value score 0–100** (recency, frequency, boxes, email engagement, referrals) → tiers Original / Chocolate / Gold.
- **Automations** (daily job): gift expiry, birthday email (15% off when buying 3+ boxes on your birthday), win-back (Chocolate/Gold after 21 days with 30% off a dozen; others after 30 days with 15%).
- **Store panel** (`/staff`): kiosk-style counter — tap products, scan the customer's member/gift QR to load their rewards, pick one, live ticket, charge (free-doughnut gifts are 0 € sales) + print receipt QR. Birthday discount auto-applied.
- **Admin** (`/admin`): KPIs, charts, customers + score breakdown, referral tree, email log/previews, wheel odds, pre-orders, demo clock.

## Run

```bash
npm install
cp .env.example .env.local   # fill RESEND_API_KEY, AUTH_SECRET
npm run db:push              # creates local.db (SQLite)
npm run dev -- -H 0.0.0.0    # phones on the same Wi-Fi can scan QRs via http://<LAN-IP>:3000
```

Store/admin PIN: `STAFF_PIN` (default `1234`).

## Demo script (5 min)

1. `/staff` → PIN → **Registrar venta** (1 box) → **Imprimir**: receipt with QR.
2. Scan QR with a phone → email + birthday → **Girar la ruleta** → gift + real email.
3. In the result, share the invite link → open it in another browser → friend gets 20%.
4. `/staff` → sale with friend's member code + gift code → referral converts, inviter gets reward email.
5. `/admin/demo` → **Generar clientes de ejemplo** → `/admin` dashboard.
6. `/admin/demo` → **+22 días** → **Ejecutar tarea diaria** → win-back emails → **Volver a hoy**.

## Email notes

- Sent with Resend. With the default `onboarding@resend.dev` sender, Resend only delivers to the **Resend account owner's address** (and `delivered@resend.dev` for testing). Verify a domain in Resend and set `EMAIL_FROM` to email anyone.
- Seeded customers (`@example.com`) are never sent real emails; their emails are logged as previews.
- Logo and tracking pixel use absolute URLs; they load in inboxes only when the app is publicly reachable (deploy or ngrok).

## Deploy (Vercel)

SQLite files are not writable on Vercel: create a Turso DB and set `DATABASE_URL=libsql://…` + `DATABASE_AUTH_TOKEN`, then `npm run db:push`. `vercel.json` runs `/api/cron/daily` at 08:00 UTC (set `CRON_SECRET`).

## Checks

```bash
npm test          # scoring, wheel odds, referral ladder, stamps, age gate
npm run typecheck
npx eslint src
```

Brand tokens are copied from krispykreme.es (`--kk-green #006939`, `--kk-red #cc112c`, `--kk-cream #fdf4eb`). Official fonts (Brandon Grotesque, Gelica) are commercial, so Montserrat and Fraunces italic stand in.
