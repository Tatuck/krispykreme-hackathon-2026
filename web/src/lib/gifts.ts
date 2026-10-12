// Gift catalog. Pure module: safe to import from client components and tests.

export type Locale = "es" | "en";

export const WHEEL_GIFT_TYPES = [
  "BOX_15",
  "FREE_GLAZED",
  "UPGRADE_DOZEN",
  "DOUBLE_REFERRAL",
  "FREE_NOW",
  "COFFEE_BOX",
] as const;
export type WheelGiftType = (typeof WHEEL_GIFT_TYPES)[number];

export type GiftType =
  | WheelGiftType
  | "FRIEND_20"
  | "REF_DOUGHNUT" // legacy: 1 doughnut per friend (first version)
  | "FREE_DOZEN" // legacy: dozen every 3 friends (first version)
  | "REF_HALF_DOZEN"
  | "REF_HALF_50"
  | "STAMP_BOX"
  | "BDAY"
  | "WINBACK_30"
  | "WINBACK_15";

export type GiftSource =
  | "wheel"
  | "referral_friend"
  | "referral_inviter"
  | "referral_ladder"
  | "stamp_card"
  | "birthday"
  | "winback";

type GiftInfo = {
  emoji: string;
  color: string; // wheel segment / badge color
  validMinutes: number;
  title: Record<Locale, string>;
  desc: Record<Locale, string>;
  short: Record<Locale, string>; // label on the wheel
};

const DAYS_14 = 14 * 24 * 60;

export const GIFTS: Record<GiftType, GiftInfo> = {
  BOX_15: {
    emoji: "🏷️",
    color: "#006939",
    validMinutes: DAYS_14,
    title: { es: "15% en tu próxima caja", en: "15% off your next box" },
    desc: {
      es: "Válido en cualquier caja de 6 o 12 donuts.",
      en: "Valid on any box of 6 or 12 doughnuts.",
    },
    short: { es: "15% caja", en: "15% box" },
  },
  FREE_GLAZED: {
    emoji: "🍩",
    color: "#CC112C",
    validMinutes: DAYS_14,
    title: { es: "Original Glazed gratis con tu caja", en: "Free Original Glazed with a box" },
    desc: {
      es: "Un Original Glazed gratis al comprar media docena o más.",
      en: "One free Original Glazed when you buy a half dozen or more.",
    },
    short: { es: "Glazed gratis", en: "Free Glazed" },
  },
  UPGRADE_DOZEN: {
    emoji: "📦",
    color: "#3A7CA5",
    validMinutes: DAYS_14,
    title: { es: "Media docena → docena", en: "Half-dozen → dozen upgrade" },
    desc: {
      es: "Paga media docena y llévate la docena completa.",
      en: "Pay for a half-dozen, take home a full dozen.",
    },
    short: { es: "6 → 12", en: "6 → 12" },
  },
  DOUBLE_REFERRAL: {
    emoji: "✌️",
    color: "#A50D23",
    validMinutes: DAYS_14 * 2,
    title: { es: "Bonus x2 por invitar", en: "2× referral bonus" },
    desc: {
      es: "Tu próximo premio por invitar amigos vale el doble.",
      en: "Your next friend-referral reward is doubled.",
    },
    short: { es: "x2 amigos", en: "2× friends" },
  },
  FREE_NOW: {
    emoji: "⚡",
    color: "#D48233",
    validMinutes: 15,
    title: { es: "¡Donut gratis AHORA!", en: "Free doughnut NOW!" },
    desc: {
      es: "Enséñalo en el mostrador en los próximos 15 minutos.",
      en: "Show it at the counter within the next 15 minutes.",
    },
    short: { es: "Gratis YA", en: "Free NOW" },
  },
  COFFEE_BOX: {
    emoji: "☕",
    color: "#6B3E26",
    validMinutes: DAYS_14,
    title: { es: "Café gratis con tu caja", en: "Free coffee with a box" },
    desc: {
      es: "Un café de regalo al comprar cualquier caja.",
      en: "A free coffee when you buy any box.",
    },
    short: { es: "Café gratis", en: "Free coffee" },
  },
  FRIEND_20: {
    emoji: "🎁",
    color: "#006939",
    validMinutes: DAYS_14 * 2,
    title: { es: "20% en tu primera caja", en: "20% off your first box" },
    desc: {
      es: "Regalo de bienvenida por venir invitado por un amigo.",
      en: "Welcome gift for joining through a friend.",
    },
    short: { es: "20% caja", en: "20% box" },
  },
  REF_DOUGHNUT: {
    emoji: "🤝",
    color: "#CC112C",
    validMinutes: DAYS_14 * 2,
    title: { es: "Donut gratis por invitar", en: "Free doughnut for inviting" },
    desc: {
      es: "Tu amigo ha comprado su primera caja. ¡Gracias!",
      en: "Your friend bought their first box. Thank you!",
    },
    short: { es: "Donut amigo", en: "Friend doughnut" },
  },
  FREE_DOZEN: {
    emoji: "🏆",
    color: "#D48233",
    validMinutes: DAYS_14 * 2,
    title: { es: "¡Docena gratis!", en: "Free dozen!" },
    desc: {
      es: "3 amigos han comprado su caja gracias a ti. Una Docena Glaseado Original o su valor en otra caja.",
      en: "3 friends bought a box thanks to you. An Original Glazed dozen, or its value off another box.",
    },
    short: { es: "Docena", en: "Dozen" },
  },
  REF_HALF_DOZEN: {
    emoji: "🤝",
    color: "#CC112C",
    validMinutes: DAYS_14 * 2,
    title: { es: "Media docena gratis", en: "Free half dozen" },
    desc: {
      es: "Tus 3 primeros amigos ya han comprado su caja. Recoge un pack de 6 Glaseado Original sin comprar nada más.",
      en: "Your first 3 friends bought their box. Pick up an Original Glazed 6-pack, no purchase needed.",
    },
    short: { es: "Media docena", en: "Half dozen" },
  },
  REF_HALF_50: {
    emoji: "🏆",
    color: "#D48233",
    validMinutes: DAYS_14 * 2,
    title: { es: "50% en media docena", en: "50% off a half dozen" },
    desc: {
      es: "3 amigos más han comprado su caja gracias a ti: media docena a mitad de precio.",
      en: "3 more friends bought a box thanks to you: a half dozen at half price.",
    },
    short: { es: "−50% media docena", en: "−50% half dozen" },
  },
  STAMP_BOX: {
    emoji: "⭐",
    color: "#006939",
    validMinutes: DAYS_14 * 2,
    title: { es: "Tu 6ª caja gratis", en: "Your 6th box free" },
    desc: {
      es: "Has completado tu tarjeta de sellos. Una Docena Glaseado Original o su valor en otra caja.",
      en: "You completed your stamp card. An Original Glazed dozen, or its value off another box.",
    },
    short: { es: "Caja gratis", en: "Free box" },
  },
  BDAY: {
    emoji: "🎂",
    color: "#E0457B",
    validMinutes: 24 * 60,
    title: { es: "15% de cumpleaños (3+ cajas)", en: "Birthday 15% off (3+ boxes)" },
    desc: {
      es: "Hoy es tu cumpleaños: 15% de descuento si te llevas más de 2 cajas. ¡Felicidades!",
      en: "It's your birthday: 15% off when you buy more than 2 boxes today. Happy birthday!",
    },
    short: { es: "Cumple", en: "Birthday" },
  },
  // Id kept from the first version (30%); the offer is 25% to protect the premium-dozen margin.
  WINBACK_30: {
    emoji: "💚",
    color: "#006939",
    validMinutes: 10 * 24 * 60,
    title: { es: "25% en una docena", en: "25% off a dozen" },
    desc: {
      es: "Te echamos de menos. Oferta exclusiva para nuestros mejores clientes.",
      en: "We miss you. Exclusive offer for our best customers.",
    },
    short: { es: "25% docena", en: "25% dozen" },
  },
  WINBACK_15: {
    emoji: "👋",
    color: "#3A7CA5",
    validMinutes: 10 * 24 * 60,
    title: { es: "15% en tu caja", en: "15% off a box" },
    desc: {
      es: "Vuelve a por tus donuts favoritos.",
      en: "Come back for your favourite doughnuts.",
    },
    short: { es: "15% caja", en: "15% box" },
  },
};

// Upgrade 6 → 12 is the priciest prize (5 € of revenue), so it is the rarest.
export const DEFAULT_WEIGHTS: Record<WheelGiftType, number> = {
  BOX_15: 35,
  FREE_GLAZED: 25,
  UPGRADE_DOZEN: 5,
  DOUBLE_REFERRAL: 15,
  FREE_NOW: 10,
  COFFEE_BOX: 10,
};

/** Weighted random pick. `rand` in [0,1) is injectable for tests. */
export function pickWeighted(
  weights: Record<WheelGiftType, number>,
  rand: number = Math.random(),
): WheelGiftType {
  const entries = WHEEL_GIFT_TYPES.map((t) => [t, Math.max(0, weights[t] ?? 0)] as const);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return "BOX_15";
  let r = rand * total;
  for (const [t, w] of entries) {
    if (r < w) return t;
    r -= w;
  }
  return entries[entries.length - 1][0];
}

/** Birthday rule: everyone buying more than 2 boxes on their birthday gets 15% off. */
export const BIRTHDAY_MIN_BOXES = 3;
export const BIRTHDAY_DISCOUNT = 0.15;

export function giftTitle(type: string, locale: Locale) {
  return GIFTS[type as GiftType]?.title[locale] ?? type;
}
