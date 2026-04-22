import { useEffect, RefObject } from "react";

/**
 * WCAG 2.5.5 (Level AAA) / 2.5.8 (Level AA) — Target Size
 * Minimum 44×44 CSS pixels for interactive targets, with adequate spacing
 * so adjacent targets don't accidentally overlap touch zones.
 *
 * This hook observes a container and, in development, warns when any
 * interactive descendant (or the container itself) falls below the minimum
 * size or sits too close to a sibling interactive element.
 *
 * It also auto-corrects by applying inline `min-width` / `min-height` and a
 * minimum margin to violators, so layout stays usable even if Tailwind
 * classes are stripped or glass spacing tokens change.
 */

const MIN_SIZE = 44; // px
const MIN_GAP = 8; // px — keeps neighbouring 44px targets from touching

type GuardOptions = {
  /** Extra selector for interactive nodes beyond the defaults. */
  selector?: string;
  /** Disable auto-correction (only warn). */
  warnOnly?: boolean;
};

const DEFAULT_SELECTOR = [
  "button",
  "a[href]",
  '[role="button"]',
  "[tabindex]:not([tabindex='-1'])",
  "input:not([type='hidden'])",
  "select",
  "textarea",
].join(",");

const isDev =
  typeof import.meta !== "undefined" &&
  (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;

function rectsTooClose(a: DOMRect, b: DOMRect): number {
  // Returns shortest gap between rects (0 if overlapping)
  const dx = Math.max(0, Math.max(a.left - b.right, b.left - a.right));
  const dy = Math.max(0, Math.max(a.top - b.bottom, b.top - a.bottom));
  return Math.hypot(dx, dy);
}

export function useTouchTargetGuard<T extends HTMLElement>(
  ref: RefObject<T>,
  options: GuardOptions = {}
) {
  const { selector, warnOnly = false } = options;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const sel = selector ? `${DEFAULT_SELECTOR},${selector}` : DEFAULT_SELECTOR;

    const audit = () => {
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>(sel)
      ).filter((el) => el.offsetParent !== null);

      const rects = nodes.map((el) => el.getBoundingClientRect());

      nodes.forEach((el, i) => {
        const r = rects[i];

        // 1) Enforce minimum hit area
        if (r.width < MIN_SIZE || r.height < MIN_SIZE) {
          if (isDev) {
            // eslint-disable-next-line no-console
            console.warn(
              `[touch-target] Element below 44×44 (${Math.round(
                r.width
              )}×${Math.round(r.height)}px)`,
              el
            );
          }
          if (!warnOnly) {
            if (r.width < MIN_SIZE) el.style.minWidth = `${MIN_SIZE}px`;
            if (r.height < MIN_SIZE) el.style.minHeight = `${MIN_SIZE}px`;
          }
        }

        // 2) Enforce minimum spacing between adjacent interactive elements
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          // Skip nested relationships
          if (el.contains(other) || other.contains(el)) continue;

          const gap = rectsTooClose(r, rects[j]);
          if (gap < MIN_GAP) {
            if (isDev) {
              // eslint-disable-next-line no-console
              console.warn(
                `[touch-target] Adjacent targets ${gap.toFixed(
                  1
                )}px apart (<${MIN_GAP}px)`,
                el,
                other
              );
            }
            if (!warnOnly) {
              const need = MIN_GAP - gap;
              // Pad the later sibling so layout shifts predictably
              other.style.margin = `${Math.ceil(need / 2)}px`;
            }
          }
        }
      });
    };

    // Run on mount + on resize + when subtree mutates (glass spacing tokens)
    audit();

    const ro = new ResizeObserver(() => audit());
    ro.observe(root);

    const mo = new MutationObserver(() => audit());
    mo.observe(root, {
      attributes: true,
      attributeFilter: ["class", "style"],
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", audit);

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", audit);
    };
  }, [ref, selector, warnOnly]);
}
