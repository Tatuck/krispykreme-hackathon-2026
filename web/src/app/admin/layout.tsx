import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getClockOffsetDays } from "@/lib/clock";
import { StaffNav } from "@/components/StaffNav";
import { AdminTabs } from "./AdminTabs";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  const { t } = await getT();
  const offset = await getClockOffsetDays();
  return (
    <>
      <StaffNav active="admin" />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="h-display text-3xl text-kk-green">{t.admin.title}</h1>
          {offset > 0 && (
            <span className="chip bg-kk-yellow text-kk-dark">⏱️ +{offset} {t.common.days}</span>
          )}
        </div>
        <AdminTabs />
        {children}
      </div>
    </>
  );
}
