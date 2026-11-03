"use client";

import { useEffect, useState } from "react";
import { ApiError, getScans } from "@/lib/api";
import { formatConfidence, formatWhen, reasonLabel } from "@/lib/format";
import { readName } from "@/lib/profile";
import type { Scan } from "@/lib/types";
import { ProfileBar } from "@/components/ProfileBar";
import { Notice, PageHeader } from "@/components/ui";

type Filter = "all" | "counted" | "other";

export default function HistoryPage() {
  const [name, setName] = useState<string | null>(null);
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    document.title = "History · EcoTrack";
    const sync = () => setName(readName());
    sync();
    window.addEventListener("ecotrack-name", sync);
    return () => window.removeEventListener("ecotrack-name", sync);
  }, []);

  useEffect(() => {
    if (!name) {
      setScans(name === "" ? [] : null);
      return;
    }
    let cancel = false;
    setError(null);
    setScans(null);
    getScans(name)
      .then((body) => {
        if (!cancel) setScans(body.scans);
      })
      .catch((reason: unknown) => {
        if (!cancel) {
          setScans([]);
          setError(reason instanceof ApiError ? reason.message : "History could not be loaded.");
        }
      });
    return () => {
      cancel = true;
    };
  }, [name]);

  const visible = (scans ?? []).filter((scan) => {
    if (filter === "counted") return scan.accepted;
    if (filter === "other") return !scan.accepted;
    return true;
  });

  return (
    <div>
      <PageHeader
        kicker="Records"
        title="Scan history"
        lede="Every attempt for this name is listed, including photos that were too uncertain to count."
      />
      <ProfileBar />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter scans">
        {(
          [
            ["all", "All"],
            ["counted", "Counted"],
            ["other", "Not counted"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={`px-3 py-1.5 text-sm ${
              filter === key ? "bg-ink text-paper-2" : "border border-line bg-card text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {name === "" ? (
        <Notice>Save your name to see the scans stored for you.</Notice>
      ) : error ? (
        <Notice tone="bad">{error}</Notice>
      ) : scans === null ? (
        <p className="text-sm text-muted">Loading scans…</p>
      ) : visible.length === 0 ? (
        <Notice>
          {scans.length === 0
            ? "No scans for this name yet. A counted result appears after a photo clears the confidence cutoff."
            : "No scans match this filter."}
        </Notice>
      ) : (
        <ul className="divide-y divide-line border border-line bg-card">
          {visible.map((scan) => (
            <li key={scan.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-baseline">
              <div>
                <p className="font-medium">{scan.label ?? "No class"}</p>
                <p className="mt-1 text-sm text-muted">
                  {formatConfidence(scan.confidence)}
                  {scan.bin_name ? ` · ${scan.bin_name}` : ""}
                  {scan.accepted ? ` · +${scan.points} points` : ` · ${reasonLabel(scan.reason, false)}`}
                </p>
              </div>
              <time className="text-sm text-muted" dateTime={scan.created_at}>
                {formatWhen(scan.created_at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
