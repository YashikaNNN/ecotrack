"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readName } from "@/lib/profile";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/scan", label: "Scan" },
  { href: "/history", label: "History" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/points", label: "Points" },
  { href: "/model", label: "Model" },
  { href: "/about", label: "About" },
];

export function Header() {
  const pathname = usePathname();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setName(readName());
    sync();
    window.addEventListener("ecotrack-name", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ecotrack-name", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <header className="border-b border-line bg-card">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4">
        <div className="flex items-baseline justify-between gap-4">
          <Link href="/" className="group">
            <span className="font-serif text-2xl tracking-tight text-ink">EcoTrack</span>
            <span className="mt-0.5 block text-xs text-muted">
              Waste sorting guide
            </span>
          </Link>
          <p className="text-right text-sm text-muted">
            {name === null ? " " : name ? `Name · ${name}` : "Name not set"}
          </p>
        </div>
        <nav aria-label="Primary" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap px-3 py-2 text-sm ${
                  active
                    ? "border-b-2 border-accent font-medium text-ink"
                    : "text-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
