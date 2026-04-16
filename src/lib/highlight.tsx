import { ReactNode } from "react";

/**
 * Wraps occurrences of `query` inside `text` with a neon-purple highlight span.
 * Case-insensitive. Returns the original text if query is empty.
 */
export function highlightMatch(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return text;
  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) && part.toLowerCase() === q.toLowerCase() ? (
        <span key={i} className="text-neon-purple font-bold">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  } catch {
    return text;
  }
}
