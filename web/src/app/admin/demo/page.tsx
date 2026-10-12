import { getT } from "@/lib/i18n/server";
import { getClockOffsetDays, now } from "@/lib/clock";
import { fmtDate } from "@/lib/format";
import { DemoControls } from "./DemoControls";

export default async function DemoPage() {
  const { t, locale } = await getT();
  const offset = await getClockOffsetDays();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
      <section className="card space-y-3">
        <h2 className="h-display text-base text-kk-green">⏱️ {t.admin.clock}</h2>
        <p className="text-sm text-kk-muted">{t.admin.clockHelp}</p>
        <p className="text-2xl font-black text-kk-green">
          {t.admin.today}: {fmtDate(await now(), locale)} {offset > 0 && <span className="text-base text-kk-orange">(+{offset} {t.common.days})</span>}
        </p>
        <DemoControls section="clock" />
      </section>
      <section className="card space-y-3">
        <h2 className="h-display text-base text-kk-green">{t.admin.seed}</h2>
        <p className="text-sm text-kk-muted">{t.admin.seedHelp}</p>
        <DemoControls section="data" />
      </section>
    </div>
  );
}
