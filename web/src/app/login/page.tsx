import { getT } from "@/lib/i18n/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { t } = await getT();
  const { e } = await searchParams;
  return (
    <div className="min-h-[70vh]">
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="card space-y-5 text-center">
          <h1 className="h-display text-2xl text-kk-green">{t.wallet.loginTitle}</h1>
          <p>{t.wallet.loginBody}</p>
          {e && <p className="rounded-2xl bg-kk-red/10 px-4 py-3 text-sm font-bold text-kk-red">{t.wallet.linkInvalid}</p>}
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
