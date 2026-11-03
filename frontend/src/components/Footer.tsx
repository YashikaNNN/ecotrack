export function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm leading-relaxed text-muted sm:flex-row sm:justify-between">
        <p>EcoTrack · EcoNex · MCA (AI/DS) ML-III-2026-T002</p>
        <p className="max-w-md">
          Bin advice and eco-points are awareness rules. Simulated bin levels
          come from stored scans. They are not sensor readings or carbon credits.
        </p>
      </div>
    </footer>
  );
}
