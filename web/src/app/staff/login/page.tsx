import { getT } from "@/lib/i18n/server";
import { PinForm } from "./PinForm";

export default async function StaffLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { t } = await getT();
  const { next } = await searchParams;
  return (
    <div className="dots-bg min-h-[70vh]">
      <div className="mx-auto max-w-sm px-4 py-16">
        <div className="card space-y-5 text-center">
          <h1 className="h-display text-2xl text-kk-green">{t.staff.pinTitle}</h1>
          <PinForm next={next?.startsWith("/") ? next : "/staff"} />
          <p className="text-xs text-kk-muted">Demo PIN: 1234</p>
        </div>
      </div>
    </div>
  );
}
