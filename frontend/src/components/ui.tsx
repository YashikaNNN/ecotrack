import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  lede,
}: {
  kicker: string;
  title: string;
  lede: string;
}) {
  return (
    <header className="mb-8 max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-brass">
        {kicker}
      </p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight text-ink sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-muted">{lede}</p>
    </header>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-line bg-card p-5 sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center bg-accent px-4 py-2.5 text-sm font-medium text-paper-2 hover:bg-accent-strong"
    >
      {children}
    </Link>
  );
}

export function Notice({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "good" | "warn" | "bad";
  children: ReactNode;
}) {
  const toneClass = {
    neutral: "border-line bg-paper-2 text-ink",
    good: "border-accent bg-accent-soft text-ink",
    warn: "border-brass bg-brass-soft text-ink",
    bad: "border-danger bg-danger-soft text-ink",
  }[tone];
  return (
    <p className={`border px-4 py-3 text-sm leading-relaxed ${toneClass}`} role="status">
      {children}
    </p>
  );
}
