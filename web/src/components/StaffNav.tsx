import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { staffLogoutAction } from "@/app/staff/actions";

export async function StaffNav({ active }: { active: "staff" | "admin" }) {
  const { t } = await getT();
  const tab = (on: boolean) =>
    `rounded-full px-4 py-2 text-xs font-black tracking-wider uppercase ${on ? "bg-kk-green text-white" : "text-kk-green hover:bg-kk-green-light"}`;
  return (
    <div className="no-print border-b border-kk-green/10 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2">
        <div className="flex gap-1">
          <Link href="/staff" className={tab(active === "staff")}>{t.nav.staff}</Link>
          <Link href="/admin" className={tab(active === "admin")}>{t.nav.admin}</Link>
        </div>
        <form action={staffLogoutAction}>
          <button className="text-xs font-bold tracking-wider text-kk-muted uppercase underline">{t.nav.logout}</button>
        </form>
      </div>
    </div>
  );
}
