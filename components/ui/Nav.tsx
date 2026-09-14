"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Mapa", icon: "🗺" },
  { href: "/comprar", label: "Comprar", icon: "🛒" },
  { href: "/viaje", label: "Mi viaje", icon: "🧳" },
] as const;

export default function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Secciones" className="flex gap-1.5">
      {TABS.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm " +
              (active ? "border-ink bg-ink text-white" : "border-line bg-panel text-ink-2")
            }
          >
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
