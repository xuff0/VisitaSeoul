"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function Button({
  variant = "plain",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "plain" | "solid" | "ghost" | "danger" }) {
  return (
    <button
      {...rest}
      className={cx(
        "cursor-pointer rounded-[10px] px-3 py-2 text-sm whitespace-nowrap transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40",
        variant === "solid" && "bg-ink text-white",
        variant === "plain" && "border border-line bg-panel",
        variant === "ghost" && "text-ink-2 hover:text-ink",
        variant === "danger" && "border border-[#f0cdc8] bg-[#fdf0ee] text-[#a12f27]",
        className,
      )}
    />
  );
}

/** Filtro de una sola opción. El estado va en aria-pressed, que también lo anuncia el lector. */
export function Chip({
  active,
  color,
  icon,
  count,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
  color?: string;
  icon?: string;
  count?: number;
}) {
  return (
    <button
      {...rest}
      aria-pressed={active}
      className={cx(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap",
        active ? "border-ink bg-ink text-white" : "border-line bg-panel",
      )}
    >
      {icon ? (
        <span aria-hidden className="text-[13px]">{icon}</span>
      ) : color ? (
        <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />
      ) : null}
      {children}
      {count != null && (
        <span className={cx("text-[13px] tabular-nums", active ? "text-[#b9bec8]" : "text-ink-3")}>{count}</span>
      )}
    </button>
  );
}

export function Toggle({ active, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      {...rest}
      aria-pressed={active}
      className={cx(
        "cursor-pointer rounded-full border px-3 py-1 text-[13.5px]",
        active ? "border-[#c3c7d0] bg-[#e2e4ea] text-ink" : "border-line text-ink-2",
      )}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="mb-2.5 block">
      <span className="mb-1 block text-[13px] text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-[9px] border border-line bg-[#fcfcfd] px-2.5 py-2 outline-none focus:border-ink";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-xl border border-line bg-panel p-3.5", className)}>{children}</div>;
}

/** Etiqueta corta de aviso: "se regatea", "1+1", "cierra 1er y 3er domingo". */
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-medium",
        tone === "neutral" && "bg-[#eceef2] text-ink-2",
        tone === "good" && "bg-[#e6f4ec] text-[#1f7a4c]",
        tone === "warn" && "bg-[#fdf3d6] text-[#8a6300]",
        tone === "bad" && "bg-[#fdf0ee] text-[#a12f27]",
      )}
    >
      {children}
    </span>
  );
}
