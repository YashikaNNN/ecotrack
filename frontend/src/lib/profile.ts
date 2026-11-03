export const NAME_KEY = "ecotrack.displayName";

const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9 .'-]*$/;

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function validateName(name: string): string | null {
  const cleaned = normalizeName(name);
  if (cleaned.length < 2 || cleaned.length > 40 || !NAME_PATTERN.test(cleaned)) {
    return "Use 2 to 40 characters, starting with a letter. Letters, numbers, spaces, apostrophes, and hyphens are allowed.";
  }
  return null;
}

export function readName() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NAME_KEY) ?? "";
}

export function writeName(name: string) {
  window.localStorage.setItem(NAME_KEY, normalizeName(name));
  window.dispatchEvent(new Event("ecotrack-name"));
}
