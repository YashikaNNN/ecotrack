export function formatConfidence(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatScore(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  if (value >= 0 && value <= 1) return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(3);
}

export function formatMap(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toFixed(3);
}

export const MATERIAL_COLOR: Record<string, string> = {
  plastic: "#3d6b8c",
  paper: "#9a7340",
  metal: "#5e656d",
  organic: "#5d7a45",
  ewaste: "#7d5270",
};

export function reasonLabel(reason: string | null, accepted: boolean) {
  if (accepted) return "Counted";
  if (reason === "low_confidence") return "Below cutoff";
  if (reason === "no_detection") return "No item found";
  if (reason === "unknown_class") return "No bin rule";
  return "Not counted";
}
