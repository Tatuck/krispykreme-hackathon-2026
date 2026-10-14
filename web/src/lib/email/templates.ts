import { GIFTS, type GiftType, type Locale } from "../gifts";
import { fmtDate } from "../format";
import type { Tier } from "../scoring";

export type EmailKind =
  | "gift_won"
  | "friend_welcome"
  | "referral_reward"
  | "stamp_reward"
  | "birthday"
  | "winback"
  | "tier_up"
  | "magic_link";

export type EmailGift = { type: string; code: string; expiresAt: number };

export type EmailData = {
  name: string | null;
  gifts: EmailGift[];
  walletUrl: string; // magic link into the wallet
  refUrl: string;
  tier?: Tier;
  friendName?: string | null;
  convertedCount?: number;
};

type Copy = { subject: string; preheader: string; heading: string; body: string; cta: string };

const TIER_NAMES: Record<Tier, Record<Locale, string>> = {
  original: { es: "Original Glazed", en: "Original Glazed" },
  chocolate: { es: "Chocolate", en: "Chocolate" },
  gold: { es: "Gold", en: "Gold" },
};

function copyFor(kind: EmailKind, d: EmailData, l: Locale): Copy {
  const hi = d.name ? (l === "es" ? `¡Hola, ${d.name}!` : `Hi ${d.name}!`) : l === "es" ? "¡Hola!" : "Hi there!";
  const es = l === "es";
  switch (kind) {
    case "gift_won":
      return {
        subject: es ? "🍩 Tu regalo de Krispy Kreme te espera" : "🍩 Your Krispy Kreme gift is waiting",
        preheader: es ? "Has ganado en la ruleta. Úsalo antes de que caduque." : "You won on the wheel. Use it before it expires.",
        heading: hi,
        body: es
          ? "Gracias por pasarte por Krispy Kreme Madrid. Esto es lo que has ganado en la ruleta:"
          : "Thanks for visiting Krispy Kreme Madrid. Here's what you won on the wheel:",
        cta: es ? "Ver mi monedero" : "Open my wallet",
      };
    case "friend_welcome":
      return {
        subject: es ? "🎁 Tu 20% en tu primera caja" : "🎁 Your 20% off your first box",
        preheader: es ? "Un amigo te ha invitado." : "A friend invited you.",
        heading: hi,
        body: es
          ? `${d.friendName ?? "Un amigo"} te ha invitado a Krispy Kreme Madrid. Tienes un 20% de descuento en tu primera caja:`
          : `${d.friendName ?? "A friend"} invited you to Krispy Kreme Madrid. Enjoy 20% off your first box:`,
        cta: es ? "Ver mi regalo" : "See my gift",
      };
    case "referral_reward":
      return {
        subject: es ? "🤝 ¡Tu amigo ha comprado su primera caja!" : "🤝 Your friend bought their first box!",
        preheader: es ? "Gracias por compartir Krispy Kreme." : "Thanks for sharing Krispy Kreme.",
        heading: hi,
        body: es
          ? `${d.friendName ?? "Tu amigo"} acaba de comprar su primera caja. Llevas ${d.convertedCount ?? 1} amigo(s): con 3, media docena gratis; luego, cada 3, otra al 50%.`
          : `${d.friendName ?? "Your friend"} just bought their first box. You're at ${d.convertedCount ?? 1} friend(s): 3 earn a free half dozen, then every 3 another at 50% off.`,
        cta: es ? "Invitar a más amigos" : "Invite more friends",
      };
    case "stamp_reward":
      return {
        subject: es ? "⭐ ¡Tarjeta completa! Tu caja gratis" : "⭐ Card complete! Your free box",
        preheader: es ? "5 cajas, la 6ª invita la casa." : "5 boxes — the 6th is on us.",
        heading: hi,
        body: es ? "Has completado tu tarjeta de sellos. Tu próxima caja es gratis:" : "You completed your stamp card. Your next box is free:",
        cta: es ? "Ver mi monedero" : "Open my wallet",
      };
    case "birthday":
      return {
        subject: es ? "🎂 ¡Feliz cumpleaños de parte de Krispy Kreme!" : "🎂 Happy birthday from Krispy Kreme!",
        preheader: es ? "Hoy: 15% comprando 3 o más cajas." : "Today: 15% off 3 or more boxes.",
        heading: es ? `¡Feliz cumpleaños${d.name ? `, ${d.name}` : ""}!` : `Happy birthday${d.name ? `, ${d.name}` : ""}!`,
        body: es
          ? "Celébralo compartiendo: hoy tienes un 15% de descuento si te llevas más de 2 cajas. ¿Montas fiesta? Encarga tus cajas y las tendremos listas."
          : "Celebrate by sharing: today you get 15% off when you buy more than 2 boxes. Throwing a party? Pre-order your boxes and we'll have them ready.",
        cta: es ? "Encargar mi caja" : "Pre-order my box",
      };
    case "winback":
      return {
        subject:
          d.tier && d.tier !== "original"
            ? es
              ? `💚 Te echamos de menos — oferta exclusiva ${TIER_NAMES[d.tier].es}`
              : `💚 We miss you — exclusive ${TIER_NAMES[d.tier].en} offer`
            : es
              ? "👋 ¡Hace tiempo que no te vemos!"
              : "👋 It's been a while!",
        preheader: es ? "Vuelve a por tus favoritos." : "Come back for your favourites.",
        heading: hi,
        body: es
          ? "Hace unas semanas que no pasas por Krispy Kreme Madrid. Los donuts recién hechos te esperan, y este regalo también:"
          : "It's been a few weeks since your last visit to Krispy Kreme Madrid. Fresh doughnuts are waiting — and so is this gift:",
        cta: es ? "Ver mi oferta" : "See my offer",
      };
    case "tier_up":
      return {
        subject: es
          ? `🎉 ¡Has subido a nivel ${TIER_NAMES[d.tier ?? "chocolate"].es}!`
          : `🎉 You reached ${TIER_NAMES[d.tier ?? "chocolate"].en} tier!`,
        preheader: es ? "Tienes un regalo nuevo en tu monedero." : "There's a new gift in your wallet.",
        heading: hi,
        body: es
          ? "Gracias por ser de la familia Krispy Kreme. Tu regalo de nivel ya está en tu monedero y, si algún día dejas de venir, te escribiremos antes (a las 3 semanas) con un 25% en una docena."
          : "Thanks for being part of the Krispy Kreme family. Your tier gift is already in your wallet and, if you ever stop coming, we'll write sooner (after 3 weeks) with 25% off a dozen.",
        cta: es ? "Ver mis ventajas" : "See my perks",
      };
    case "magic_link":
      return {
        subject: es ? "🔑 Tu enlace para entrar en Krispy Kreme" : "🔑 Your Krispy Kreme sign-in link",
        preheader: es ? "Válido durante 7 días." : "Valid for 7 days.",
        heading: hi,
        body: es ? "Pulsa el botón para abrir tu monedero. El enlace caduca en 7 días." : "Tap the button to open your wallet. The link expires in 7 days.",
        cta: es ? "Abrir mi monedero" : "Open my wallet",
      };
  }
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function giftCard(g: EmailGift, l: Locale) {
  const info = GIFTS[g.type as GiftType];
  const color = info?.color ?? "#006939";
  return `
  <tr><td style="padding:8px 0">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:2px dashed ${color};border-radius:14px;background:#FFFDF8">
      <tr>
        <td style="padding:16px;font-size:34px;width:56px;text-align:center">${info?.emoji ?? "🎁"}</td>
        <td style="padding:16px 16px 16px 0">
          <div style="font-weight:800;font-size:17px;color:#2B2B2B">${esc(info?.title[l] ?? g.type)}</div>
          <div style="font-size:13px;color:#5B514A;margin-top:4px">${esc(info?.desc[l] ?? "")}</div>
          <div style="margin-top:10px;font-family:monospace;font-size:16px;letter-spacing:2px;background:${color};color:#fff;display:inline-block;padding:4px 10px;border-radius:6px">${esc(g.code)}</div>
          <div style="font-size:12px;color:#8A7F76;margin-top:6px">${l === "es" ? "Válido hasta" : "Valid until"} ${fmtDate(g.expiresAt, l, true)}</div>
        </td>
      </tr>
    </table>
  </td></tr>`;
}

/**
 * Renders a table-based HTML email. `track(url)` wraps links for click tracking,
 * `pixelUrl` is the 1x1 open-tracking image.
 */
export function renderEmail(
  kind: EmailKind,
  d: EmailData,
  l: Locale,
  opts: { track: (url: string) => string; pixelUrl: string | null; assetBase: string },
): { subject: string; html: string } {
  const c = copyFor(kind, d, l);
  const ctaUrl = kind === "referral_reward" ? d.walletUrl + "#invite" : kind === "birthday" ? d.walletUrl + "#preorder" : d.walletUrl;
  const es = l === "es";
  const html = `<!doctype html>
<html lang="${l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.subject)}</title></head>
<body style="margin:0;background:#FDF4EB;font-family:Montserrat,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(c.preheader)}</span>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FDF4EB;padding:24px 12px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
  <tr><td align="center" style="background:#ffffff;padding:20px 24px 14px">
    <img src="${esc(opts.assetBase)}/kk-logo.png" width="190" alt="Krispy Kreme" style="display:block;width:190px;height:auto;border:0">
    <div style="margin-top:6px;font-size:11px;font-weight:900;letter-spacing:3px;color:#006939;text-transform:uppercase">Madrid Rewards</div>
  </td></tr>
  <tr><td style="height:8px;background:#006939"></td></tr>
  <tr><td style="padding:28px 24px 8px">
    <h1 style="margin:0 0 10px;font-size:24px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:#006939">${esc(c.heading)}</h1>
    <p style="margin:0;font-size:15px;line-height:1.5;color:#4C4C4C">${esc(c.body)}</p>
  </td></tr>
  <tr><td style="padding:8px 24px">
    <table width="100%" cellpadding="0" cellspacing="0">${d.gifts.map((g) => giftCard(g, l)).join("")}</table>
  </td></tr>
  <tr><td align="center" style="padding:16px 24px 8px">
    <a href="${esc(opts.track(ctaUrl))}" style="background:#CC112C;color:#fff;text-decoration:none;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;padding:14px 30px;border-radius:999px;display:inline-block;font-size:14px">${esc(c.cta)}</a>
  </td></tr>
  ${
    kind === "magic_link"
      ? ""
      : `<tr><td style="padding:20px 24px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#E6F0EA;border-radius:14px"><tr><td style="padding:16px">
      <div style="font-weight:800;color:#006939">${es ? "🤝 Invita y gana" : "🤝 Invite & earn"}</div>
      <div style="font-size:13px;color:#4C4C4C;margin-top:4px">${
        es
          ? "Tus amigos: 20% en su primera caja. Tú: media docena gratis con 3 amigos y otra al 50% cada 3 más."
          : "Friends: 20% off their first box. You: a free half dozen at 3 friends and another at 50% off every 3 more."
      }</div>
      <div style="margin-top:8px"><a href="${esc(opts.track(d.refUrl))}" style="color:#006939;font-weight:700">${esc(d.refUrl)}</a></div>
    </td></tr></table>
  </td></tr>`
  }
  <tr><td style="padding:16px 24px 24px;font-size:11px;color:#8A7F76;line-height:1.5">
    ${es ? "Krispy Kreme Madrid · Demo hackathon. Recibes este email porque te registraste con tu ticket." : "Krispy Kreme Madrid · Hackathon demo. You receive this email because you signed up with your receipt."}
  </td></tr>
</table>
</td></tr></table>
${opts.pixelUrl ? `<img src="${esc(opts.pixelUrl)}" width="1" height="1" alt="" style="display:block;border:0">` : ""}
</body></html>`;
  return { subject: c.subject, html };
}
