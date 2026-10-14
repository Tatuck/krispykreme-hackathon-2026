# Krispy Kreme Madrid · Rewards

🇬🇧 English · [🇪🇸 Español](README.es.md) · **Live demo: https://hack2026.tatuck.com**

Loyalty and referral web app built for the **Krispy Kreme hackathon organized by [STARTComillas](https://www.instagram.com/startcomillas/)** (Universidad Pontificia Comillas, Madrid, October 2026).

**Challenge:** many Krispy Kreme customers buy once and never come back, and most sales are single doughnuts. This prototype turns a paper receipt into the start of a relationship: every purchase earns rewards, and the rewards push customers towards buying **boxes** and bringing friends.

![Home](docs/img/home.png)

## How it works

1. **Receipt QR → gift wheel.** Every receipt has a QR. The customer scans it, signs up with their email, and spins a wheel that favours box rewards.
2. **Wallet.** A member card with a QR code, a stamp card (5 boxes → 6th free), tier progress (Original / Chocolate / Gold), gifts and box pre-orders.
3. **Referrals.** The friend gets 20% off their first box. The inviter gets a doughnut per friend and a free dozen every 3 friends.
4. **Automations.** Birthday offers, win-back emails for customers who stop coming, gift expiry, and a 0–100 value score per customer.
5. **Store kiosk.** The cashier taps products, scans the customer's QR to apply rewards, charges, and prints the receipt with its QR.
6. **Admin dashboard.** KPIs (return rate, % of sales with a box, margin, discount cost), customers, referral tree, emails, wheel odds and a demo "time machine".

| Wheel | Prize | Wallet |
|---|---|---|
| ![Wheel](docs/img/wheel.png) | ![Prize](docs/img/won.png) | ![Wallet](docs/img/wallet.png) |

![Store kiosk](docs/img/kiosk.png)
![Admin dashboard](docs/img/admin.png)

## Tech

Next.js 16 · React 19 · Tailwind v4 · Drizzle ORM on SQLite/Turso · Resend for email. The app lives in [`web/`](web/). Its [README](web/README.md) explains setup, the 5-minute demo script and deployment.

```bash
cd web && npm install && cp .env.example .env.local && npm run db:push && npm run dev
```

Store/admin PIN: `1234`.

On the public demo that PIN opens the kiosk and the admin panel, but it can't wipe the data: that needs the secret `ADMIN_PIN`. The database is capped (500 customers, 3,000 receipts by default); when it fills up, new sign-ups are refused and the daily cron resets it with fresh sample data.

## License

[MIT](LICENSE).

> Hackathon prototype. Not affiliated with or endorsed by Krispy Kreme.
