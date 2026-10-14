// Sale pricing: how each gift and the birthday rule discount a ticket.
// Pure module: safe to import from client components and tests.
import { BIRTHDAY_DISCOUNT, BIRTHDAY_MIN_BOXES, giftTitle, type GiftType, type Locale } from "./gifts";
import { punchCard, stampValue, type PunchResult } from "./scoring";

// Real Madrid menu (krispykreme.es / challenge deck): Original Glazed dozen, pack of 6, single doughnut.
export const PRICE_BOX_CENTS = 1390;
export const PRICE_HALF_DOZEN_CENTS = 890;
export const PRICE_UNIT_CENTS = 190;

/**
 * Volume discount for events and offices (boxes in one sale), highest tier that applies.
 * Never stacks with the birthday 15%: the larger of the two is used.
 */
export const EVENT_TIERS = [
  { minBoxes: 20, pct: 0.2 },
  { minBoxes: 10, pct: 0.15 },
  { minBoxes: 5, pct: 0.1 },
] as const;
export const eventDiscountPct = (boxes: number) => EVENT_TIERS.find((t) => boxes >= t.minBoxes)?.pct ?? 0;

export type DiscountKind = GiftType | "BIRTHDAY" | "STAMP_CARD" | "EVENT" | "BIRTHDAY_TOWER";

/** Doughnut mountain: a your-way dozen built as a birthday cake, plus its assembly. */
export const TOWER_ID = "tower";
export const TOWER_ASSEMBLY_CENTS = 200;
export type DiscountLine = { kind: DiscountKind; cents: number };
export type GiftRuleError = "giftNeedsBox" | "giftNeedsUnit" | "giftNeedsBoxes" | "giftNotAtCounter";

/**
 * What a gift can act on. The optional prices come from the cart (`cartTotals`): the priciest box,
 * the cheapest doughnut and the cheapest drink; they default to the demo dozen/doughnut prices.
 */
export type SaleInput = {
  boxes: number;
  units: number;
  subtotalCents: number;
  drinks?: number;
  boxCents?: number;
  unitCents?: number;
  drinkCents?: number;
  /** Doughnut mountains on the ticket (assembly is free on the member's birthday). */
  towers?: number;
};
export type Quote = { subtotalCents: number; discounts: DiscountLine[]; totalCents: number };

/** Discount a gift gives on this sale, or why it can't be used on it. */
export function giftDiscount(type: GiftType, sale: SaleInput): { cents: number } | { error: GiftRuleError } {
  const boxCents = sale.boxCents ?? PRICE_BOX_CENTS;
  // Free boxes are worth at most an Original Glazed dozen, whatever box the customer picks.
  const freeBox = Math.min(boxCents, PRICE_BOX_CENTS);
  const pctOfBox = (pct: number) => Math.round(boxCents * pct);
  const needsBox = (cents: number) => (sale.boxes > 0 ? { cents } : { error: "giftNeedsBox" as const });
  const needsUnit = (cents: number) => (sale.units > 0 ? { cents } : { error: "giftNeedsUnit" as const });
  switch (type) {
    case "BOX_15":
    case "WINBACK_15":
      return needsBox(pctOfBox(0.15));
    case "FRIEND_20":
      return needsBox(pctOfBox(0.2));
    case "WINBACK_30": // historical id: the win-back offer is now 25%
      return needsBox(pctOfBox(0.25));
    case "FREE_DOZEN":
    case "STAMP_BOX":
      return needsBox(freeBox);
    case "UPGRADE_DOZEN":
      return needsBox(PRICE_BOX_CENTS - PRICE_HALF_DOZEN_CENTS);
    case "COFFEE_BOX":
      return needsBox(sale.drinks ? (sale.drinkCents ?? 0) : 0); // one coffee, if it's on the ticket
    case "TIER_GOLD_50": // half price on one box, worth at most half an Original Glazed dozen
      return needsBox(Math.round(freeBox * 0.5));
    case "REF_HALF_DOZEN": // a free Original Glazed 6-pack, or its value off a bigger box
      return needsBox(Math.min(boxCents, PRICE_HALF_DOZEN_CENTS));
    case "REF_HALF_50": // half price on a half dozen (capped at the 6-pack's value)
      return needsBox(Math.round(Math.min(boxCents, PRICE_HALF_DOZEN_CENTS) * 0.5));
    case "FREE_GLAZED": // the free doughnut comes with a half dozen or more
      return sale.boxes > 0 ? needsUnit(sale.unitCents ?? PRICE_UNIT_CENTS) : { error: "giftNeedsBox" };
    case "FREE_NOW": // no purchase needed: the free doughnut alone is fine
    case "REF_DOUGHNUT":
      return needsUnit(sale.unitCents ?? PRICE_UNIT_CENTS); // the cheapest doughnut on the ticket
    case "BDAY":
      return sale.boxes >= BIRTHDAY_MIN_BOXES
        ? { cents: Math.round(sale.subtotalCents * BIRTHDAY_DISCOUNT) }
        : { error: "giftNeedsBoxes" };
    case "DOUBLE_REFERRAL":
      return { error: "giftNotAtCounter" }; // consumed automatically when a friend converts
  }
}

/**
 * Prices a sale. `freeBoxCents` = boxes the stamp card makes free in this sale (`stampCardForCart`).
 * `birthday` = the linked member's birthday is today (automatic 15% on 3+ boxes, applied once even
 * if they also hand over a BDAY gift). The event volume discount (`EVENT_TIERS`) and the birthday
 * one don't stack: the larger applies. Discounts never exceed the subtotal.
 */
export function quoteSale(
  sale: SaleInput,
  opts: { giftType?: GiftType | null; birthday?: boolean; freeBoxCents?: number[] } = {},
): Quote | { error: GiftRuleError } {
  const discounts: DiscountLine[] = [];
  let left = sale.subtotalCents;
  const add = (kind: DiscountKind, cents: number) => {
    const c = Math.min(Math.max(0, cents), left);
    discounts.push({ kind, cents: c });
    left -= c;
  };
  if (opts.giftType) {
    const d = giftDiscount(opts.giftType, sale);
    if ("error" in d) return d;
    add(opts.giftType, d.cents);
  }
  for (const cents of opts.freeBoxCents ?? []) add("STAMP_CARD", cents);
  // Birthday: the mountain is charged as a your-way dozen (free assembly).
  if (opts.birthday && sale.towers) add("BIRTHDAY_TOWER", sale.towers * TOWER_ASSEMBLY_CENTS);
  const bdayPct =
    opts.birthday && sale.boxes >= BIRTHDAY_MIN_BOXES && opts.giftType !== "BDAY" ? BIRTHDAY_DISCOUNT : 0;
  const eventPct = opts.giftType === "BDAY" ? 0 : eventDiscountPct(sale.boxes);
  if (eventPct > bdayPct) add("EVENT", Math.round(left * eventPct));
  else if (bdayPct) add("BIRTHDAY", Math.round(left * bdayPct));
  return { subtotalCents: sale.subtotalCents, discounts, totalCents: left };
}

export function discountLabel(kind: DiscountKind, locale: Locale) {
  if (kind === "BIRTHDAY") return locale === "es" ? "Cumpleaños 15% (3+ cajas)" : "Birthday 15% (3+ boxes)";
  if (kind === "STAMP_CARD") return locale === "es" ? "Tarjeta de sellos: caja gratis" : "Stamp card: free box";
  if (kind === "BIRTHDAY_TOWER") return locale === "es" ? "Cumpleaños: montaje de la Montaña gratis" : "Birthday: free mountain assembly";
  if (kind === "EVENT") return locale === "es" ? "Descuento eventos (5+ cajas)" : "Event discount (5+ boxes)";
  return giftTitle(kind, locale);
}

// ---- Counter catalog (staff kiosk) ----

export type ProductKind = "box" | "unit" | "drink";
export type Product = {
  id: string;
  kind: ProductKind;
  priceCents: number;
  /** Unit cost (challenge deck cost table; illustrative). Drinks are our own estimate. */
  costCents: number;
  size?: number; // doughnuts in a box
  glaze: string; // icing color for the tile glyph
  name: Record<Locale, string>;
};

export const PRODUCTS: Product[] = [
  { id: "dozen-og", kind: "box", size: 12, priceCents: PRICE_BOX_CENTS, costCents: 187, glaze: "#e7a957", name: { es: "Docena Glaseado Original", en: "Original Glazed dozen" } },
  { id: "dozen-half", kind: "box", size: 12, priceCents: 1490, costCents: 241, glaze: "#5a3320", name: { es: "Docena mitad y mitad", en: "Half & half dozen" } },
  { id: "dozen-mix", kind: "box", size: 12, priceCents: 1790, costCents: 359, glaze: "#f29bb5", name: { es: "Docena a tu manera", en: "Your-way dozen" } },
  { id: "half-og", kind: "box", size: 6, priceCents: PRICE_HALF_DOZEN_CENTS, costCents: 162, glaze: "#e7a957", name: { es: "Pack de 6 Glaseado Original", en: "Original Glazed 6-pack" } },
  { id: "half-mix", kind: "box", size: 6, priceCents: 990, costCents: 197, glaze: "#f29bb5", name: { es: "Pack de 6 a tu manera", en: "Your-way 6-pack" } },
  // Cost = your-way dozen + cake base (our estimate).
  { id: TOWER_ID, kind: "box", size: 12, priceCents: 1990, costCents: 389, glaze: "#cc112c", name: { es: "Montaña de donuts (12)", en: "Doughnut mountain (12)" } },
  { id: "og", kind: "unit", priceCents: PRICE_UNIT_CENTS, costCents: 11, glaze: "#e7a957", name: { es: "Glaseado Original", en: "Original Glazed" } },
  { id: "choc", kind: "unit", priceCents: 220, costCents: 20, glaze: "#5a3320", name: { es: "Glaseado con chocolate", en: "Chocolate Glazed" } },
  { id: "pinky", kind: "unit", priceCents: 220, costCents: 20, glaze: "#f3a3bb", name: { es: "Pinky Promise", en: "Pinky Promise" } },
  { id: "straw", kind: "unit", priceCents: 250, costCents: 24, glaze: "#f29bb5", name: { es: "Sueño de Fresa", en: "Strawberry Dream" } },
  { id: "caramel", kind: "unit", priceCents: 250, costCents: 26, glaze: "#b8742f", name: { es: "Dulce de leche", en: "Dulce de leche" } },
  { id: "biscoff", kind: "unit", priceCents: 290, costCents: 25, glaze: "#9c5a1c", name: { es: "Biscoff", en: "Biscoff" } },
  { id: "coffee", kind: "drink", priceCents: 250, costCents: 40, glaze: "#6b3e26", name: { es: "Americano", en: "Americano" } },
  { id: "latte", kind: "drink", priceCents: 250, costCents: 50, glaze: "#c9a27e", name: { es: "Latte", en: "Latte" } },
  { id: "cappuccino", kind: "drink", priceCents: 300, costCents: 50, glaze: "#a87b56", name: { es: "Cappuccino", en: "Cappuccino" } },
];
const PRODUCT_BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));
export const productById = (id: string) => PRODUCT_BY_ID.get(id);

export type CartLine = { id: string; qty: number };
export type CartTotals = Required<SaleInput> & {
  lines: { product: Product; qty: number; cents: number }[];
  /** One entry per box, priciest first: the order the stamp card walks them in. */
  boxList: { cents: number; stamp: number }[];
  /** Ingredient cost of the cart (`Product.costCents`). */
  costCents: number;
};

/** Prices a cart from the catalog; null if it names an unknown product. Duplicate ids are merged. */
export function cartTotals(cart: CartLine[]): CartTotals | null {
  const qty = new Map<string, number>();
  for (const l of cart) {
    if (!PRODUCT_BY_ID.has(l.id)) return null;
    if (l.qty > 0) qty.set(l.id, (qty.get(l.id) ?? 0) + l.qty);
  }
  const t: CartTotals = {
    boxes: 0, units: 0, drinks: 0, subtotalCents: 0,
    boxCents: 0, unitCents: Infinity, drinkCents: Infinity, towers: 0, lines: [], boxList: [], costCents: 0,
  };
  for (const product of PRODUCTS) {
    const n = qty.get(product.id);
    if (!n) continue;
    const cents = n * product.priceCents;
    t.lines.push({ product, qty: n, cents });
    t.subtotalCents += cents;
    t.costCents += n * product.costCents;
    if (product.kind === "box") {
      t.boxes += n;
      if (product.id === TOWER_ID) t.towers += n;
      t.boxCents = Math.max(t.boxCents, product.priceCents);
      for (let i = 0; i < n; i++) t.boxList.push({ cents: product.priceCents, stamp: stampValue(product.size ?? 12) });
    } else if (product.kind === "unit") {
      t.units += n;
      t.unitCents = Math.min(t.unitCents, product.priceCents);
    } else {
      t.drinks += n;
      t.drinkCents = Math.min(t.drinkCents, product.priceCents);
    }
  }
  t.boxList.sort((a, b) => b.cents - a.cents);
  if (!t.boxes) t.boxCents = PRICE_BOX_CENTS;
  if (!t.units) t.unitCents = PRICE_UNIT_CENTS;
  if (!t.drinks) t.drinkCents = 0;
  return t;
}

/** Stamp weight of each box on a ticket; old tickets without items count every box as a dozen. */
export function boxStamps(items: CartLine[], boxes: number): number[] {
  const t = items.length ? cartTotals(items) : null;
  return t ? t.boxList.map((b) => b.stamp) : Array(boxes).fill(1);
}

/** What the member's stamp card does to this cart when charged at the counter, plus the free boxes' prices. */
export function stampCardForCart(stamps: number, cart: CartTotals): PunchResult & { freeCents: number[] } {
  const r = punchCard(stamps, cart.boxList.map((b) => b.stamp), true);
  return { ...r, freeCents: r.free.map((i) => Math.min(cart.boxList[i].cents, PRICE_BOX_CENTS)) };
}

/** Cart with the least extra items a gift needs to apply ("add and apply" at the counter). */
export function fillCartForGift(type: GiftType, cart: CartLine[]): CartLine[] {
  const t = cartTotals(cart);
  if (!t) return cart;
  const add: CartLine[] = [];
  const minBoxes = type === "BDAY" ? BIRTHDAY_MIN_BOXES : 1;
  const d = giftDiscount(type, t);
  if ("error" in d && (d.error === "giftNeedsBox" || d.error === "giftNeedsBoxes")) {
    const halfDozen = type === "REF_HALF_DOZEN" || type === "REF_HALF_50" || type === "FREE_GLAZED";
    add.push({ id: halfDozen ? "half-og" : "dozen-og", qty: minBoxes - t.boxes });
  }
  // The free Glazed also needs the doughnut itself on the ticket.
  if (type === "FREE_GLAZED" ? !t.units : "error" in d && d.error === "giftNeedsUnit") add.push({ id: "og", qty: 1 });
  if (type === "COFFEE_BOX" && !t.drinks) add.push({ id: "coffee", qty: 1 });
  return addToCart(cart, add);
}

export function addToCart(cart: CartLine[], add: CartLine[]): CartLine[] {
  const next = cart.map((l) => ({ ...l }));
  for (const a of add) {
    const line = next.find((l) => l.id === a.id);
    if (line) line.qty += a.qty;
    else next.push({ ...a });
  }
  return next.filter((l) => l.qty > 0);
}

/** Reads the `tickets.items` JSON column (empty for tickets made before the catalog). */
export function parseItems(json: string | null | undefined): CartLine[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.filter((l) => PRODUCT_BY_ID.has(l?.id) && l.qty > 0) : [];
  } catch {
    return [];
  }
}

/** Reads the `tickets.discounts` JSON column. */
export function parseDiscounts(json: string | null | undefined): DiscountLine[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// ---- Pre-orders (customer wallet) ----

/** Boxes a customer can pre-order: the counter catalog's boxes. */
export const PREORDER_BOXES = PRODUCTS.filter((p) => p.kind === "box");
export const PREORDER_MAX_BOXES = 50;
export const PREORDER_OCCASIONS = ["birthday", "office", "party", "other"] as const;
export type PreorderOccasion = (typeof PREORDER_OCCASIONS)[number];

/**
 * Prices a pre-order: boxes only, list price, plus the event volume discount or the automatic
 * birthday 15% (3+ boxes, pickup on the member's birthday), whichever is larger. Gifts and stamps are applied at the counter on pickup.
 * Null if the cart is empty, has non-box or unknown items, or exceeds the box limit.
 */
export function quotePreorder(cart: CartLine[], opts: { birthday: boolean }): (Quote & { boxes: number }) | null {
  const totals = cartTotals(cart);
  if (!totals || !totals.boxes || totals.boxes > PREORDER_MAX_BOXES) return null;
  if (totals.units || totals.drinks) return null;
  const q = quoteSale(totals, { birthday: opts.birthday });
  if ("error" in q) return null;
  return { ...q, boxes: totals.boxes };
}
