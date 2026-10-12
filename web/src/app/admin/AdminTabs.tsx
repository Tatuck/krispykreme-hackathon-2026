"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/client";

export function AdminTabs() {
  const { t } = useT();
  const path = usePathname();
  const tabs = [
    ["/admin", t.admin.dashboard],
    ["/admin/customers", t.admin.customers],
    ["/admin/referrals", t.admin.referrals],
    ["/admin/emails", t.admin.emails],
    ["/admin/wheel", t.admin.gifts],
    ["/admin/preorders", t.admin.preorders],
    ["/admin/demo", t.admin.demo, "⏱️"],
  ] as const;
  return (
    <div className="no-print -mx-4 overflow-x-auto px-4">
      <div className="flex gap-1 whitespace-nowrap">
        {tabs.map(([href, label]) => {
          const on = href === "/admin" ? path === href : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-full px-4 py-2 text-xs font-black tracking-wider uppercase ${
                on ? "bg-kk-red text-white" : "bg-white text-kk-ink hover:text-kk-red"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
