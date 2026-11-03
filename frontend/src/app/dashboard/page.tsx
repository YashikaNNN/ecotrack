"use client";

import { useEffect, useState } from "react";
import { ApiError, getStats } from "@/lib/api";
import { readName } from "@/lib/profile";
import type { Stats } from "@/lib/types";
import { ClassChart } from "@/components/ClassChart";
import { ProfileBar } from "@/components/ProfileBar";
import { Notice, PageHeader } from "@/components/ui";

export default function DashboardPage() {
  const [name, setName] = useState<string | null>(null);
  const [scope, setScope] = useState<"user" | "all">("user");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Dashboard · EcoTrack";
    const sync = () => setName(readName());
    sync();
    window.addEventListener("ecotrack-name", sync);
    return () => window.removeEventListener("ecotrack-name", sync);
  }, []);

  useEffect(() => {
    if (name === null) return;
    if (scope === "user" && !name) {
      setStats(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancel = false;
    setLoading(true);
    setError(null);
    getStats(scope === "user" ? name : undefined)
      .then((body) => {
        if (!cancel) setStats(body);
      })
      .catch((reason: unknown) => {
        if (!cancel) {
          setStats(null);
          setError(reason instanceof ApiError ? reason.message : "Statistics could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [name, scope]);

  const hasCounts = (stats?.accepted ?? 0) > 0;

  return (
    <div>
      <PageHeader
        kicker="Statistics"
        title="What has been sorted"
        lede="Counts come from scans stored by this app. Bin fill is those counts divided by a simulated capacity of 20."
      />
      <ProfileBar />

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Whose scans">
        <button
          type="button"
          aria-pressed={scope === "user"}
          onClick={() => setScope("user")}
          className={`px-3 py-1.5 text-sm ${scope === "user" ? "bg-ink text-paper-2" : "border border-line bg-card"}`}
        >
          My scans
        </button>
        <button
          type="button"
          aria-pressed={scope === "all"}
          onClick={() => setScope("all")}
          className={`px-3 py-1.5 text-sm ${scope === "all" ? "bg-ink text-paper-2" : "border border-line bg-card"}`}
        >
          Everyone on this computer
        </button>
      </div>

      {error ? <Notice tone="bad">{error}</Notice> : null}
      {scope === "user" && name === "" ? (
        <Notice>Save your name to see your own counts, or switch to everyone.</Notice>
      ) : null}
      {loading ? <p className="text-sm text-muted">Loading counts…</p> : null}

      {stats && !loading ? (
        <>
          <dl className="grid gap-4 sm:grid-cols-3">
            {[
              ["Accepted scans", String(stats.accepted)],
              ["Attempts not counted", String(stats.rejected)],
              ["Points", String(stats.points)],
            ].map(([label, value]) => (
              <div key={label} className="border border-line bg-card p-4">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="mt-2 font-serif text-4xl tracking-tight">{value}</dd>
              </div>
            ))}
          </dl>

          {hasCounts ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="min-w-0 border border-line bg-card p-5">
                <h2 className="font-serif text-2xl tracking-tight">Accepted scans by material</h2>
                <p className="mt-1 text-xs text-muted">
                  Source: scans stored in this app
                  {stats.display_name ? ` for ${stats.display_name}` : ""}. Each bar is a count of accepted scans.
                </p>
                <div className="mt-4">
                  <ClassChart rows={stats.by_class} />
                </div>
                <table className="mt-4 w-full text-left text-sm">
                  <caption className="sr-only">Accepted scans by material</caption>
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th className="py-2 font-medium">Material</th>
                      <th className="py-2 text-right font-medium">Accepted scans</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.by_class.map((row) => (
                      <tr key={row.key} className="border-b border-line last:border-0">
                        <td className="py-2">{row.label}</td>
                        <td className="py-2 text-right tabular-nums">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="border border-line bg-card p-5">
                <h2 className="font-serif text-2xl tracking-tight">Simulated bins</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  Fill is accepted scans divided by {stats.bin_capacity}. Nothing here is read from a physical bin.
                </p>
                <ul className="mt-5 space-y-4">
                  {stats.bins.map((bin) => {
                    const width = Math.min(bin.fill, 1) * 100;
                    return (
                      <li key={bin.key}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="font-medium">{bin.bin}</span>
                          <span className="tabular-nums text-muted">
                            {bin.count}/{bin.capacity}
                          </span>
                        </div>
                        <div className="mt-2 h-2 bg-paper" aria-hidden="true">
                          <div className="h-2 bg-accent" style={{ width: `${width}%` }} />
                        </div>
                        {bin.count > bin.capacity ? (
                          <p className="mt-1 text-xs text-muted">
                            {bin.count} accepted scans is past the simulated capacity of {bin.capacity}.
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          ) : (
            <div className="mt-8">
              <Notice>
                No accepted scans in this view yet. Category charts and simulated bins appear after a photo is counted.
              </Notice>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
