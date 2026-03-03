/**
 * Robust clipboard copy with fallback for insecure contexts / iframe sandboxes.
 * Returns true if copy succeeded.
 */
const PUBLISHED_ORIGIN = "https://rankit.today";

/**
 * Returns the published site origin, avoiding preview/lovable internal URLs.
 */
export function getPublishedOrigin(): string {
  if (typeof window === "undefined") return PUBLISHED_ORIGIN;
  const { origin } = window.location;
  // If running inside lovable preview or localhost, use published URL
  if (origin.includes("lovableproject.com") || origin.includes("lovable.app/id-preview") || origin.includes("localhost")) {
    return PUBLISHED_ORIGIN;
  }
  return origin;
}

/**
 * Returns the full published URL for the current path.
 */
export function getPublishedUrl(): string {
  if (typeof window === "undefined") return PUBLISHED_ORIGIN;
  const path = window.location.pathname + window.location.search + window.location.hash;
  // Strip lovable token from query
  const url = new URL(path, getPublishedOrigin());
  url.searchParams.delete("__lovable_token");
  return url.toString();
}

export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern API first
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy
    }
  }

  // Legacy fallback using execCommand
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
