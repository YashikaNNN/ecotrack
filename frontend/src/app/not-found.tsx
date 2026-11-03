import { TextLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="max-w-xl">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-brass">
        Missing page
      </p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">That page is not part of EcoTrack.</h1>
      <p className="mt-3 text-muted">
        The app covers scanning, history, the dashboard, and points.
      </p>
      <div className="mt-6">
        <TextLink href="/">Back to the start</TextLink>
      </div>
    </div>
  );
}
