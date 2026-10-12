import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getT } from "@/lib/i18n/server";
import { claimedInThisBrowser, getSessionCustomer } from "@/lib/auth";
import { normalizeCode } from "@/lib/codes";
import { getBaseUrl } from "@/lib/url";
import { now } from "@/lib/clock";
import { ClaimFlow } from "./ClaimFlow";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { t } = await getT();
  const ticket = await db.query.tickets.findFirst({ where: eq(schema.tickets.code, normalizeCode(code)) });
  const me = await getSessionCustomer();

    // Claimed by the current session: keep rendering the flow so the spin result survives
  // the refresh that follows the server action (session cookie is set there).
  // A guest claim (existing account, no session) is remembered by a short-lived claim cookie.
  const claimedByMe =
    !!ticket?.claimedAt &&
    ((!!me && ticket.customerId === me.id) || (await claimedInThisBrowser(ticket.code)));
  // Mirrors claimTicket: the wheel spins for a box or on the customer's first visit.
  // Unknown visitors get the wheel shown (they are new unless they sign in as a member).
  const willSpin = !!ticket && (ticket.boxes > 0 || !me || me.visits === 0);
  if (!ticket || (ticket.claimedAt && !claimedByMe)) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="h-display text-2xl text-kk-green">{ticket ? t.ticket.alreadyClaimed : t.ticket.notFound}</h1>
        <p className="mt-3">{ticket ? t.ticket.alreadyClaimedHelp : t.ticket.notFoundHelp}</p>
        <Link href="/me" className="btn-primary mt-8">
          {t.nav.wallet}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh]">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="text-center">
          <h1 className="kk-script text-[44px] leading-none text-kk-red">{t.ticket.title}</h1>
          <p className="mt-3 text-sm font-bold text-kk-green">
            {[
              ticket.boxes > 0 && `${ticket.boxes} ${ticket.boxes === 1 ? t.ticket.box : t.ticket.boxes}`,
              ticket.units > 0 && `${ticket.units} ${t.ticket.units}`,
            ]
              .filter(Boolean)
              .join(" + ")}
          </p>
          <p className="mx-auto mt-2 max-w-[32ch]">
            {!me ? t.ticket.subtitle : willSpin ? t.ticket.subtitleKnownSpin : t.ticket.subtitleKnown}
          </p>
        </div>
        <ClaimFlow
          ticketCode={ticket.code}
          known={me ? { name: me.name ?? me.email, stamps: me.stamps } : null}
          willSpin={willSpin}
          baseUrl={await getBaseUrl()}
          serverNow={await now()}
          alreadyClaimed={claimedByMe}
        />
      </div>
    </div>
  );
}
