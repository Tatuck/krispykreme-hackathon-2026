import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getT } from "@/lib/i18n/server";

export default async function EmailPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const e = await db.query.emails.findFirst({ where: eq(schema.emails.id, Number(id)) });
  if (!e) notFound();
  return (
    <div className="space-y-4">
      <Link href="/admin/emails" className="text-xs font-bold tracking-wider text-kk-muted uppercase underline">← {t.admin.emails}</Link>
      <div className="card space-y-1">
        <p className="font-black text-kk-green">{e.subject}</p>
        <p className="text-xs text-kk-muted">
          {e.kind} · {e.status} {e.error && `· ${e.error}`}
        </p>
      </div>
      {/* Sandboxed: no scripts, and the tracking pixel can't fire from preview. */}
      <iframe title={t.admin.preview} srcDoc={e.html.replace(/<img[^>]+\/api\/e\/o\/[^>]+>/g, "")} sandbox="" className="h-[820px] w-full rounded-[15px] border-0 bg-white" />
    </div>
  );
}
