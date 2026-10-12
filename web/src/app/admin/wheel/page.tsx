import { getT } from "@/lib/i18n/server";
import { getWheelWeights } from "@/lib/settings";
import { GIFTS, WHEEL_GIFT_TYPES } from "@/lib/gifts";
import { saveWeightsAction } from "../actions";

export default async function WheelPage() {
  const { t, locale } = await getT();
  const w = await getWheelWeights();
  const total = WHEEL_GIFT_TYPES.reduce((s, k) => s + (w[k] ?? 0), 0) || 1;
  return (
    <form action={saveWeightsAction} className="card max-w-2xl space-y-4">
      <div>
        <h2 className="h-display text-base text-kk-green">{t.admin.weights}</h2>
        <p className="text-sm text-kk-muted">{t.admin.weightsHelp}</p>
      </div>
      {WHEEL_GIFT_TYPES.map((k) => (
        <div key={k} className="grid grid-cols-[1fr_90px_56px] items-center gap-3">
          <div>
            <p className="font-bold">{GIFTS[k].emoji} {GIFTS[k].title[locale]}</p>
            <div className="mt-1 h-2 rounded-full bg-kk-cream">
              <div className="h-full rounded-full" style={{ width: `${((w[k] ?? 0) / total) * 100}%`, background: GIFTS[k].color }} />
            </div>
          </div>
          <input name={k} type="number" min={0} max={1000} defaultValue={w[k] ?? 0} className="input px-3 py-2 text-center" />
          <span className="text-right font-black tabular-nums">{Math.round(((w[k] ?? 0) / total) * 100)}%</span>
        </div>
      ))}
      <button className="btn-green">{t.common.save}</button>
    </form>
  );
}
