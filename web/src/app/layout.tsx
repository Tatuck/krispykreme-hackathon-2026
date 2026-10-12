import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Jost, Fraunces } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/lib/i18n/server";
import { dicts } from "@/lib/i18n/dict";
import { I18nProvider } from "@/lib/i18n/client";
import { LangToggle } from "@/components/LangToggle";
import { Logo } from "@/components/Logo";

const jost = Jost({ variable: "--font-jost", subsets: ["latin"], weight: ["400", "500", "700", "800", "900"] });
// Soft axis makes Fraunces read like the rounded Gelica italic used on krispykreme.es.
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], style: ["italic"], axes: ["SOFT", "WONK"] });

export const metadata: Metadata = {
  title: "Krispy Kreme Madrid Rewards",
  description: "Scan your receipt, spin the wheel, invite friends and earn free boxes.",
};

export const viewport: Viewport = { themeColor: "#006939" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = dicts[locale];
  return (
    <html lang={locale} className={`${jost.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale}>
          <header className="no-print sticky top-0 z-30 bg-kk-green shadow-[0_4px_8px_rgba(0,0,0,0.25)]">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
              <Link href="/" aria-label="Krispy Kreme Madrid" className="shrink-0">
                <Logo className="h-10 w-auto sm:h-12" />
              </Link>
              <nav className="flex items-center gap-4 sm:gap-7">
                <Link href="/" className="hidden text-[15px] font-black tracking-[0.06em] text-white uppercase hover:text-kk-cream sm:inline">
                  {t.nav.home}
                </Link>
                <Link href="/me" className="text-sm font-black tracking-[0.06em] whitespace-nowrap text-white uppercase hover:text-kk-cream sm:text-[15px]">
                  {t.nav.wallet}
                </Link>
                <LangToggle />
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="no-print bg-kk-green text-white">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-8">
              <Logo className="h-10 w-auto" />
              <nav className="flex gap-8 text-sm">
                <Link href="/me" className="hover:underline">{t.nav.wallet}</Link>
                <Link href="/staff" className="hover:underline">{t.nav.staff}</Link>
                <Link href="/admin" className="hover:underline">{t.nav.admin}</Link>
              </nav>
              <p className="text-sm text-white/70">{t.footer}</p>
            </div>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
