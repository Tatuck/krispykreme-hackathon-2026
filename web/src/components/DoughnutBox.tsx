import Image from "next/image";
import { Doughnut } from "./Logo";

/**
 * Open Krispy Kreme box. `filled` slots hold a glazed doughnut (a .5 shows half a doughnut,
 * a half-dozen stamp); `reward` turns the
 * last slot into the prize slot (stamp card). `drop` staggers a load-in animation.
 */
export function DoughnutBox({
  slots,
  filled,
  cols,
  reward,
  drop = false,
  lid = true,
  className = "",
}: {
  slots: number;
  filled: number;
  cols: number;
  reward?: string;
  drop?: boolean;
  lid?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {lid && (
        <div className="mx-[4%] origin-bottom [transform:perspective(600px)_rotateX(38deg)]">
          <div className="flex aspect-[3.4/1] items-center justify-center rounded-t-[14px] border-b-[6px] border-kk-green bg-white shadow-[inset_0_-14px_20px_-14px_rgba(0,0,0,0.18)]">
            <Image src="/kk-logo.png" alt="" width={960} height={311} className="h-[46%] w-auto" />
          </div>
        </div>
      )}
      <div className="rounded-[14px] bg-white p-[3.5%] shadow-[0_24px_40px_-24px_rgba(0,50,25,0.55)]">
        <div
          className="grid gap-[4%] rounded-[8px] bg-kk-sand p-[4%]"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: slots }).map((_, i) => {
            const isReward = reward !== undefined && i === slots - 1;
            const full = i + 1 <= filled;
            const half = !full && i < filled;
            return (
              <div
                key={i}
                className="relative flex aspect-square items-center justify-center rounded-full bg-[#ecdcc8] shadow-[inset_0_3px_6px_rgba(120,80,40,0.25)]"
              >
                {isReward ? (
                  <span className="kk-script px-1 text-center text-[clamp(11px,2.6vw,17px)] leading-none text-kk-red">
                    {reward}
                  </span>
                ) : full || half ? (
                  <span
                    className={`block h-[92%] w-[92%] ${drop ? "kk-drop" : ""} ${half ? "[clip-path:inset(0_50%_0_0)]" : ""}`}
                    style={drop ? { animationDelay: `${200 + i * 90}ms` } : undefined}
                  >
                    <Doughnut className="h-full w-full drop-shadow-[0_3px_3px_rgba(90,50,10,0.35)] [--hole:#ecdcc8]" />
                  </span>
                ) : (
                  <span className="text-sm font-bold text-kk-muted/70 tabular-nums">{i + 1}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
