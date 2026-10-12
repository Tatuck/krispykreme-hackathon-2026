import { describe, expect, it } from "vitest";
import {
  PREORDER_MAX_BOXES,
  PRICE_BOX_CENTS,
  PRICE_HALF_DOZEN_CENTS,
  PRICE_UNIT_CENTS,
  cartTotals,
  fillCartForGift,
  parseItems,
  quotePreorder,
  quoteSale,
  stampCardForCart,
  type CartLine,
} from "../pricing";

const sale = (boxes: number, units = 0, subtotalCents = boxes * PRICE_BOX_CENTS + units * PRICE_UNIT_CENTS) => ({
  boxes,
  units,
  subtotalCents,
});

describe("quoteSale", () => {
  it("no gift, no birthday: total = subtotal", () => {
    expect(quoteSale(sale(2))).toEqual({ subtotalCents: 2780, discounts: [], totalCents: 2780 });
  });

  it("referred friend's FRIEND_20 takes 20% off one box", () => {
    const q = quoteSale(sale(1), { giftType: "FRIEND_20" });
    expect(q).toEqual({ subtotalCents: 1390, discounts: [{ kind: "FRIEND_20", cents: 278 }], totalCents: 1112 });
  });

  it("box gifts require a box; doughnut gifts require a doughnut", () => {
    expect(quoteSale(sale(0, 3), { giftType: "FRIEND_20" })).toEqual({ error: "giftNeedsBox" });
    expect(quoteSale(sale(0, 1), { giftType: "FREE_GLAZED" })).toEqual({ error: "giftNeedsBox" }); // needs a half dozen+
    expect(quoteSale(sale(1), { giftType: "FREE_GLAZED" })).toEqual({ error: "giftNeedsUnit" });
    expect(quoteSale(sale(1, 1), { giftType: "FREE_GLAZED" })).toMatchObject({ totalCents: PRICE_BOX_CENTS });
    expect(quoteSale(sale(0, 1), { giftType: "FREE_NOW" })).toMatchObject({ totalCents: 0 }); // no purchase needed
  });

  it("free box never goes below zero", () => {
    expect(quoteSale(sale(1, 0, 1000), { giftType: "STAMP_BOX" })).toMatchObject({ totalCents: 0 });
  });

  it("birthday 15% stacks after the gift, only with 3+ boxes", () => {
    const q = quoteSale(sale(3), { giftType: "BOX_15", birthday: true });
    expect(q).toEqual({
      subtotalCents: 4170,
      discounts: [
        { kind: "BOX_15", cents: 209 },
        { kind: "BIRTHDAY", cents: 594 },
      ],
      totalCents: 3367,
    });
    expect(quoteSale(sale(2), { birthday: true })).toMatchObject({ discounts: [] });
  });

  it("BDAY gift on a birthday is applied once", () => {
    const q = quoteSale(sale(3), { giftType: "BDAY", birthday: true });
    expect(q).toMatchObject({ discounts: [{ kind: "BDAY", cents: 626 }], totalCents: 3544 });
    expect(quoteSale(sale(2), { giftType: "BDAY" })).toEqual({ error: "giftNeedsBoxes" });
  });

  it("win-back offer for valuable customers is 25% of the box", () => {
    expect(quoteSale(sale(1), { giftType: "WINBACK_30" })).toMatchObject({ discounts: [{ kind: "WINBACK_30", cents: 348 }] });
  });

  it("event volume discount: 5+ boxes 10%, 10+ 15%, 20+ 20%; no stacking with birthday", () => {
    expect(quoteSale(sale(4))).toMatchObject({ discounts: [] });
    expect(quoteSale(sale(5))).toMatchObject({ discounts: [{ kind: "EVENT", cents: 695 }] });
    expect(quoteSale(sale(10))).toMatchObject({ discounts: [{ kind: "EVENT", cents: 2085 }] });
    expect(quoteSale(sale(20))).toMatchObject({ discounts: [{ kind: "EVENT", cents: 5560 }] });
    expect(quoteSale(sale(5), { birthday: true })).toMatchObject({ discounts: [{ kind: "BIRTHDAY", cents: 1043 }] });
    expect(quoteSale(sale(20), { birthday: true })).toMatchObject({ discounts: [{ kind: "EVENT", cents: 5560 }] });
  });

  it("DOUBLE_REFERRAL can't be redeemed at the counter", () => {
    expect(quoteSale(sale(1), { giftType: "DOUBLE_REFERRAL" })).toEqual({ error: "giftNotAtCounter" });
  });
});

describe("kiosk cart", () => {
  const totals = (cart: CartLine[]) => cartTotals(cart)!;

  it("derives boxes, units and subtotal from the catalog", () => {
    const t = totals([{ id: "dozen-og", qty: 1 }, { id: "half-mix", qty: 1 }, { id: "choc", qty: 2 }, { id: "coffee", qty: 1 }]);
    expect(t).toMatchObject({ boxes: 2, units: 2, drinks: 1, subtotalCents: 1390 + 990 + 440 + 250, costCents: 187 + 197 + 40 + 40 });
    expect(t.lines.map((l) => l.product.id)).toEqual(["dozen-og", "half-mix", "choc", "coffee"]);
  });

  it("rejects unknown products and merges duplicates", () => {
    expect(cartTotals([{ id: "nope", qty: 1 }])).toBeNull();
    expect(totals([{ id: "og", qty: 1 }, { id: "og", qty: 2 }]).lines[0].qty).toBe(3);
  });

  it("a free doughnut gift makes the cheapest doughnut free", () => {
    expect(quoteSale(totals([{ id: "choc", qty: 1 }]), { giftType: "FREE_NOW" })).toMatchObject({ totalCents: 0 });
    expect(quoteSale(totals([{ id: "half-og", qty: 1 }, { id: "choc", qty: 1 }]), { giftType: "FREE_GLAZED" })).toMatchObject({
      totalCents: 890,
    });
    expect(quoteSale(totals([{ id: "og", qty: 1 }, { id: "biscoff", qty: 1 }]), { giftType: "REF_DOUGHNUT" })).toMatchObject({
      totalCents: 290,
    });
  });

  it("free box gifts are worth at most an Original Glazed dozen; coffee gift takes one coffee off", () => {
    expect(quoteSale(totals([{ id: "dozen-og", qty: 1 }]), { giftType: "STAMP_BOX" })).toMatchObject({ totalCents: 0 });
    expect(quoteSale(totals([{ id: "dozen-mix", qty: 1 }]), { giftType: "FREE_DOZEN" })).toMatchObject({ totalCents: 1790 - PRICE_BOX_CENTS });
    expect(quoteSale(totals([{ id: "dozen-og", qty: 1 }, { id: "latte", qty: 1 }]), { giftType: "COFFEE_BOX" })).toMatchObject({
      totalCents: 1390,
    });
  });

  it("fillCartForGift adds only what the gift is missing", () => {
    expect(fillCartForGift("FREE_NOW", [])).toEqual([{ id: "og", qty: 1 }]);
    expect(fillCartForGift("FREE_GLAZED", [])).toEqual([{ id: "half-og", qty: 1 }, { id: "og", qty: 1 }]);
    expect(fillCartForGift("FREE_GLAZED", [{ id: "dozen-og", qty: 1 }, { id: "choc", qty: 1 }])).toEqual([
      { id: "dozen-og", qty: 1 },
      { id: "choc", qty: 1 },
    ]);
    expect(fillCartForGift("BDAY", [{ id: "dozen-mix", qty: 1 }])).toEqual([
      { id: "dozen-mix", qty: 1 },
      { id: "dozen-og", qty: 2 },
    ]);
    expect(fillCartForGift("COFFEE_BOX", [])).toEqual([{ id: "dozen-og", qty: 1 }, { id: "coffee", qty: 1 }]);
  });

  it("stamp card: the 6th box of the sale comes off the ticket, then the larger of event / birthday", () => {
    const cart = totals([{ id: "dozen-og", qty: 7 }]);
    const card = stampCardForCart(0, cart);
    expect(card).toMatchObject({ stamps: 1, freeCents: [PRICE_BOX_CENTS] });
    expect(quoteSale(cart, { freeBoxCents: card.freeCents })).toMatchObject({
      discounts: [{ kind: "STAMP_CARD", cents: PRICE_BOX_CENTS }, { kind: "EVENT", cents: 834 }],
      totalCents: 6 * PRICE_BOX_CENTS - 834,
    });
    const q = quoteSale(cart, { freeBoxCents: card.freeCents, birthday: true });
    expect(q).toMatchObject({ discounts: [{ kind: "STAMP_CARD", cents: PRICE_BOX_CENTS }, { kind: "BIRTHDAY", cents: 1251 }] });
  });

  it("stamp card free box is capped at an Original Glazed dozen", () => {
    expect(stampCardForCart(5, totals([{ id: "dozen-mix", qty: 1 }]))).toMatchObject({ freeCents: [PRICE_BOX_CENTS] });
  });

  it("a doughnut mountain is one box of 12; on a birthday its assembly is free", () => {
    const t = totals([{ id: "tower", qty: 1 }]);
    expect(t).toMatchObject({ boxes: 1, towers: 1, subtotalCents: 1990 });
    expect(t.boxList).toEqual([{ cents: 1990, stamp: 1 }]);
    expect(quoteSale(t)).toMatchObject({ discounts: [], totalCents: 1990 });
    expect(quoteSale(t, { birthday: true })).toMatchObject({ discounts: [{ kind: "BIRTHDAY_TOWER", cents: 200 }], totalCents: 1790 });
    const party = totals([{ id: "tower", qty: 1 }, { id: "dozen-og", qty: 2 }]);
    expect(quoteSale(party, { birthday: true })).toMatchObject({
      discounts: [{ kind: "BIRTHDAY_TOWER", cents: 200 }, { kind: "BIRTHDAY", cents: Math.round((1990 + 2780 - 200) * 0.15) }],
    });
  });

  it("referral ladder gifts: a free half dozen, then 50% off a half dozen", () => {
    expect(quoteSale(totals([{ id: "half-og", qty: 1 }]), { giftType: "REF_HALF_DOZEN" })).toMatchObject({ totalCents: 0 });
    expect(quoteSale(totals([{ id: "dozen-og", qty: 1 }]), { giftType: "REF_HALF_DOZEN" })).toMatchObject({ totalCents: 1390 - 890 });
    expect(quoteSale(totals([{ id: "half-og", qty: 1 }]), { giftType: "REF_HALF_50" })).toMatchObject({ totalCents: 445 });
    expect(quoteSale(totals([{ id: "dozen-og", qty: 1 }]), { giftType: "REF_HALF_50" })).toMatchObject({ totalCents: 1390 - 445 });
    expect(fillCartForGift("REF_HALF_DOZEN", [])).toEqual([{ id: "half-og", qty: 1 }]);
    expect(fillCartForGift("REF_HALF_50", [])).toEqual([{ id: "half-og", qty: 1 }]);
  });

  it("stamp card: boxes go priciest first, a half dozen stamps half", () => {
    const cart = totals([{ id: "half-mix", qty: 2 }, { id: "dozen-mix", qty: 1 }]);
    expect(cart.boxList).toEqual([{ cents: 1790, stamp: 1 }, { cents: 990, stamp: 0.5 }, { cents: 990, stamp: 0.5 }]);
    expect(stampCardForCart(4, cart)).toMatchObject({ stamps: 0.5, freeCents: [990] });
  });

  it("parseItems tolerates old tickets and junk", () => {
    expect(parseItems("[]")).toEqual([]);
    expect(parseItems("oops")).toEqual([]);
    expect(parseItems('[{"id":"og","qty":2},{"id":"x","qty":1}]')).toEqual([{ id: "og", qty: 2 }]);
  });
});

describe("quotePreorder", () => {
  it("prices mixed boxes at list price", () => {
    const q = quotePreorder([{ id: "dozen-og", qty: 1 }, { id: "half-og", qty: 2 }], { birthday: false });
    expect(q).toMatchObject({ boxes: 3, subtotalCents: PRICE_BOX_CENTS + 2 * PRICE_HALF_DOZEN_CENTS, discounts: [] });
    expect(q?.totalCents).toBe(q?.subtotalCents);
  });

  it("applies the birthday 15% only from 3 boxes", () => {
    expect(quotePreorder([{ id: "dozen-og", qty: 2 }], { birthday: true })?.discounts).toEqual([]);
    const q = quotePreorder([{ id: "dozen-og", qty: 3 }], { birthday: true });
    expect(q?.discounts).toEqual([{ kind: "BIRTHDAY", cents: Math.round(3 * PRICE_BOX_CENTS * 0.15) }]);
    expect(q?.totalCents).toBe(3 * PRICE_BOX_CENTS - Math.round(3 * PRICE_BOX_CENTS * 0.15));
  });

  it("event discount for big orders beats the birthday one when larger", () => {
    const q = quotePreorder([{ id: "dozen-og", qty: 20 }], { birthday: true });
    expect(q?.discounts).toEqual([{ kind: "EVENT", cents: 5560 }]);
  });

  it("rejects empty carts, non-box items, unknown ids and too many boxes", () => {
    expect(quotePreorder([], { birthday: false })).toBeNull();
    expect(quotePreorder([{ id: "og", qty: 1 }, { id: "dozen-og", qty: 1 }], { birthday: false })).toBeNull();
    expect(quotePreorder([{ id: "nope", qty: 1 }], { birthday: false })).toBeNull();
    expect(quotePreorder([{ id: "dozen-og", qty: PREORDER_MAX_BOXES + 1 }], { birthday: false })).toBeNull();
  });
});
