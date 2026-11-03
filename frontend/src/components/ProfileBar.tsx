"use client";

import { useEffect, useState, type FormEvent } from "react";
import { normalizeName, readName, validateName, writeName } from "@/lib/profile";

export function ProfileBar() {
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const current = readName();
      setSaved(current);
      setDraft(current);
    };
    sync();
    window.addEventListener("ecotrack-name", sync);
    return () => window.removeEventListener("ecotrack-name", sync);
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const message = validateName(draft);
    if (message) {
      setError(message);
      return;
    }
    writeName(normalizeName(draft));
    setError(null);
  }

  return (
    <form onSubmit={onSubmit} className="mb-8 border border-line bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1 text-sm">
          <span className="font-medium text-ink">Your name</span>
          <span className="mt-1 block text-muted">
            Scans, points, and history are stored under this name on this computer.
          </span>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            name="display-name"
            autoComplete="nickname"
            maxLength={40}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "name-error" : undefined}
            className="mt-3 w-full border border-line bg-paper-2 px-3 py-2 text-ink"
            placeholder="For example, Yashika"
          />
        </label>
        <button
          type="submit"
          className="bg-accent px-4 py-2.5 text-sm font-medium text-paper-2 hover:bg-accent-strong"
        >
          Save name
        </button>
      </div>
      {error ? (
        <p id="name-error" className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : saved ? (
        <p className="mt-3 text-sm text-muted">Saved as {saved}.</p>
      ) : saved === "" ? (
        <p className="mt-3 text-sm text-muted">Set a name before scanning.</p>
      ) : null}
    </form>
  );
}
