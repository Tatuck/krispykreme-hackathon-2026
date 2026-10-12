import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { Doughnut } from "@/components/Logo";
import { DoughnutMountain } from "@/components/DoughnutMountain";
import { DoughnutBox } from "@/components/DoughnutBox";
import { Skyline } from "@/components/Skyline";

// Ring colours of the official store locator, one per step.
const RINGS = ["#006939", "#cc112c", "#d48233", "#3a7ca5"];

export default async function Home() {
  const { t } = await getT();
  const steps = [
    { title: t.home.step1, d: t.home.step1d },
    { title: t.home.step2, d: t.home.step2d },
    { title: t.home.step3, d: t.home.step3d },
    { title: t.home.step4, d: t.home.step4d },
  ];
  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 md:grid-cols-[1.1fr_1fr] md:pt-20 md:pb-24">
        <div className="text-center md:text-left">
          <h1 className="leading-[0.95]">
            <span className="kk-script block text-[clamp(52px,8vw,96px)] text-kk-red">{t.home.titleScript}</span>
            <span className="h-display block text-[clamp(40px,6.6vw,84px)] tracking-[0.07em] text-kk-green">
              {t.home.titleCaps}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-[34ch] text-xl leading-relaxed text-kk-ink md:mx-0">{t.home.subtitle}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3 md:justify-start">
            <Link href="/me" className="btn-primary">
              {t.home.ctaWallet}
            </Link>
            <Link href="/staff" className="btn-ghost">
              {t.home.ctaDemo}
            </Link>
          </div>
        </div>
        <DoughnutBox slots={12} filled={12} cols={4} drop className="mx-auto w-full max-w-[460px] rotate-[-4deg]" />
      </section>

      <Skyline />

      <section className="kk-wedge bg-kk-green pt-16 pb-28 text-white">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="h-display text-center text-[clamp(26px,3.4vw,40px)] tracking-[0.05em]">{t.home.perks}</h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <Perk title={t.home.perkStamps} d={t.home.perkStampsD}>
              <DoughnutBox slots={6} filled={5} cols={3} reward={t.home.free} lid={false} className="w-[78%]" />
            </Perk>
            <Perk title={t.home.perkFriends} d={t.home.perkFriendsD}>
              <div className="flex w-[80%] items-end justify-center">
                {[0, 1, 2].map((i) => (
                  <Doughnut key={i} className={`h-auto w-1/3 [--hole:#fff] ${i === 1 ? "-mx-2 mb-6 scale-125" : ""}`} />
                ))}
              </div>
            </Perk>
            <Perk title={t.home.perkBirthdayShort} d={t.home.perkBirthdayD}>
              <DoughnutMountain className="h-auto w-[70%]" />
            </Perk>
            <Perk title={t.home.perkEvents} d={t.home.perkEventsD}>
              <span className="kk-script text-[clamp(44px,5vw,64px)] leading-none text-kk-red">−20%</span>
            </Perk>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="h-display text-center text-[clamp(26px,3.4vw,40px)] text-kk-green">{t.home.how}</h2>
        <ol className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="text-center">
              <span
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-[5px] bg-white text-4xl sm:h-32 sm:w-32 sm:border-[6px] sm:text-5xl font-black shadow-[0_8px_16px_-8px_rgba(0,0,0,0.3)]"
                style={{ borderColor: RINGS[i], color: RINGS[i] }}
              >
                {i + 1}
              </span>
              <h3 className="h-display mt-5 text-base text-kk-dark sm:text-lg">{s.title}</h3>
              <p className="mx-auto mt-1 max-w-[26ch] text-[15px] text-kk-ink sm:text-base">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Perk({ title, d, children }: { title: string; d: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex aspect-square max-w-[260px] items-center justify-center rounded-[20px] bg-white sm:max-w-none shadow-[0_10px_24px_-10px_rgba(0,0,0,0.45)]">
        {children}
      </div>
      <h3 className="h-display mt-6 text-lg">{title}</h3>
      <p className="mx-auto mt-1 max-w-[28ch] text-white/85">{d}</p>
    </div>
  );
}
