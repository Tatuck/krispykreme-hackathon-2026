import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

// Timestamps are stored as epoch milliseconds so the demo "time travel" clock
// (see lib/clock.ts) can be compared with plain arithmetic.

export const customers = sqliteTable(
  "customers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull().unique(),
    name: text("name"),
    dob: text("dob").notNull(), // YYYY-MM-DD
    locale: text("locale").notNull().default("es"),
    refCode: text("ref_code").notNull().unique(), // also the member code shown in the wallet
    referredById: integer("referred_by_id"),
    marketingConsent: integer("marketing_consent", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
    lastVisitAt: integer("last_visit_at"),
    visits: integer("visits").notNull().default(0),
    boxesTotal: integer("boxes_total").notNull().default(0),
    spendCents: integer("spend_cents").notNull().default(0),
    stamps: real("stamps").notNull().default(0), // current stamp card progress (0-4.5; a half dozen stamps 0.5)
    emailOpens: integer("email_opens").notNull().default(0),
    emailClicks: integer("email_clicks").notNull().default(0),
    score: integer("score").notNull().default(0),
    tier: text("tier").notNull().default("original"),
    lastWinbackAt: integer("last_winback_at"),
    lastBirthdayYear: integer("last_birthday_year"),
  },
  (t) => [index("customers_referred_by_idx").on(t.referredById)],
);

// A ticket is one in-store sale. Its QR lets the buyer claim it (spin + history).
export const tickets = sqliteTable("tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  boxes: integer("boxes").notNull().default(0),
  units: integer("units").notNull().default(0),
  amountCents: integer("amount_cents").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  claimedAt: integer("claimed_at"),
  customerId: integer("customer_id"),
  appliedGiftCode: text("applied_gift_code"),
  // JSON DiscountLine[] (lib/pricing.ts). amountCents is the total after these.
  discounts: text("discounts").notNull().default("[]"),
  // JSON CartLine[] (lib/pricing.ts) from the staff kiosk; boxes/units are derived from it.
  items: text("items").notNull().default("[]"),
});

export const gifts = sqliteTable(
  "gifts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull().unique(),
    customerId: integer("customer_id").notNull(),
    type: text("type").notNull(),
    source: text("source").notNull(),
    status: text("status").notNull().default("active"), // active | used | expired
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
    usedAt: integer("used_at"),
  },
  (t) => [index("gifts_customer_idx").on(t.customerId)],
);

export const referrals = sqliteTable("referrals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  inviterId: integer("inviter_id").notNull(),
  friendId: integer("friend_id").notNull().unique(),
  status: text("status").notNull().default("signed_up"), // signed_up | converted
  createdAt: integer("created_at").notNull(),
  convertedAt: integer("converted_at"),
});

export const emails = sqliteTable(
  "emails",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerId: integer("customer_id").notNull(),
    kind: text("kind").notNull(),
    subject: text("subject").notNull(),
    html: text("html").notNull(),
    status: text("status").notNull(), // sent | failed | preview
    error: text("error"),
    sentAt: integer("sent_at").notNull(),
    openedAt: integer("opened_at"),
    clickedAt: integer("clicked_at"),
  },
  (t) => [index("emails_customer_idx").on(t.customerId)],
);

export const preorders = sqliteTable("preorders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull(),
  boxType: text("box_type").notNull(),
  quantity: integer("quantity").notNull(), // total boxes
  items: text("items").notNull().default("[]"), // JSON CartLine[] (boxes); "[]" on old rows
  totalCents: integer("total_cents").notNull().default(0), // quoted at order time; 0 on old rows
  pickupDate: text("pickup_date").notNull(),
  occasion: text("occasion").notNull(),
  note: text("note"),
  createdAt: integer("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON
});

export type Customer = typeof customers.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Gift = typeof gifts.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type EmailRow = typeof emails.$inferSelect;
export type Preorder = typeof preorders.$inferSelect;
