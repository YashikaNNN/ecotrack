"use client";

import { useEffect, useState } from "react";
import { ApiError, getLeaderboard, getRules, getStats } from "@/lib/api";
import { readName } from "@/lib/profile";
import type { Leaderboard, Rules, Stats } from "@/lib/types";
import { ProfileBar } from "@/components/ProfileBar";
import { Notice, PageHeader } from "@/components/ui";

export default function PointsPage() {
  const [name, setName] = useState<string | null>(null);
  const [rules, setRules] = useState<Rules | null>(null);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [mine, setMine] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Points · EcoTrack";
    const sync = () => setName(readName());
    sync();
    window.addEventListener("ecotrack-name", sync);
    return () => window.removeEventListener("ecotrack-name", sync);
  }, []);

  useEffect(() => {
    let cancel = false;
    Promise.all([getRules(), getLeaderboard()])
      .then(([ruleBody, boardBody]) => {
        if (cancel) return;
        setRules(ruleBody);
        setBoard(boardBody);
      })
      .catch((reason: unknown) => {
        if (!cancel) {
          setError(reason instanceof ApiError ? reason.message : "Points could not be loaded.");
        }
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!name) {
      setMine(null);
      return;
    }
    let cancel = false;
    getStats(name)
      .then((body) => {
        if (!cancel) setMine(body);
      })
      .catch(() => {
        if (!cancel) setMine(null);
      });
    return () => {
      cancel = true;
    };
  }, [name]);

  return (
    <div>
      <PageHeader
        kicker="Awareness score"
        title="Eco-points"
        lede="Points are added from a fixed table after an accepted scan. They encourage sorting. They are not carbon credits."
      />
      <ProfileBar />
      {error ? <Notice tone="bad">{error}</Notice> : null}

      <section className="border border-line bg-card p-5">
        <h2 className="font-serif text-2xl tracking-tight">Your total</h2>
        {name === "" ? (
          <p className="mt-3 text-sm text-muted">Save your name to see your points.</p>
        ) : mine ? (
          <p className="mt-3 font-serif text-5xl tracking-tight">{mine.points}</p>
        ) : name ? (
          <p className="mt-3 text-sm text-muted">Loading your total…</p>
        ) : null}
        {mine ? (
          <p className="mt-2 text-sm text-muted">
            From {mine.accepted} accepted {mine.accepted === 1 ? "scan" : "scans"}.
          </p>
        ) : null}
      </section>

      {rules ? (
        <section className="mt-6 border border-line bg-card p-5">
          <h2 className="font-serif text-2xl tracking-tight">Point table</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{rules.note}</p>
          <p className="mt-2 text-sm text-muted">
            Cutoff: {(rules.threshold * 100).toFixed(0)}% confidence.
          </p>
          <table className="mt-4 w-full text-left text-sm">
            <caption className="sr-only">Points and bins by material</caption>
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-2 font-medium">Material</th>
                <th className="py-2 font-medium">Bin</th>
                <th className="py-2 text-right font-medium">Points</th>
              </tr>
            </thead>
            <tbody>
              {rules.classes.map((item) => (
                <tr key={item.key} className="border-b border-line last:border-0">
                  <td className="py-2">{item.label}</td>
                  <td className="py-2">{item.bin}</td>
                  <td className="py-2 text-right tabular-nums">{item.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="mt-6 border border-line bg-card p-5">
        <h2 className="font-serif text-2xl tracking-tight">Leaderboard</h2>
        <p className="mt-2 text-sm text-muted">
          Names are the ones typed into this app. There is no password account.
        </p>
        {board && board.entries.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No points yet. A name appears here after an accepted scan.
          </p>
        ) : null}
        {board && board.entries.length > 0 ? (
          <ol className="mt-4 divide-y divide-line">
            {board.entries.map((entry, index) => {
              const mineRow = name !== null && entry.display_name === name;
              return (
                <li
                  key={entry.display_name}
                  className={`flex items-baseline justify-between gap-4 py-3 text-sm ${mineRow ? "bg-accent-soft px-2" : ""}`}
                >
                  <span>
                    <span className="mr-3 tabular-nums text-muted">{index + 1}</span>
                    {entry.display_name}
                    <span className="ml-2 text-muted">
                      {entry.accepted_scans} accepted
                    </span>
                  </span>
                  <span className="font-medium tabular-nums">{entry.points}</span>
                </li>
              );
            })}
          </ol>
        ) : null}
        {!board && !error ? <p className="mt-4 text-sm text-muted">Loading the leaderboard…</p> : null}
      </section>
    </div>
  );
}
