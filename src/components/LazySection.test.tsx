import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { lazy } from "react";
import LazySection from "./LazySection";

/**
 * Regression test for the "black flash / scroll snaps to top" bug.
 *
 * Root cause that was fixed: when a `lazy()` component inside a LazySection
 * began loading on scroll, the *parent* Suspense boundary (around the whole
 * homepage) caught it and unmounted every sibling section. The page collapsed
 * to height 0, scroll jumped to the top, and the page re-mounted.
 *
 * The fix wraps each LazySection's children in its own Suspense boundary so
 * a suspending child only blanks its own slot.
 *
 * These tests assert that contract.
 */

// Track all observers so we can fire them manually.
type ObsCb = (entries: IntersectionObserverEntry[]) => void;
const observers: { cb: ObsCb; el: Element }[] = [];

beforeEach(() => {
  observers.length = 0;
  // @ts-expect-error - test stub
  window.IntersectionObserver = class {
    cb: ObsCb;
    constructor(cb: ObsCb) {
      this.cb = cb;
    }
    observe(el: Element) {
      observers.push({ cb: this.cb, el });
    }
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  };
});

const triggerIntersect = () => {
  act(() => {
    observers.forEach(({ cb, el }) => {
      cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry]);
    });
  });
};

describe("LazySection", () => {
  it("renders children once the section enters the viewport", async () => {
    render(
      <LazySection>
        <div>visible-content</div>
      </LazySection>,
    );

    expect(screen.queryByText("visible-content")).not.toBeInTheDocument();

    triggerIntersect();

    await waitFor(() =>
      expect(screen.getByText("visible-content")).toBeInTheDocument(),
    );
  });

  it("isolates a suspending lazy child so sibling sections stay mounted (no black flash / scroll jump)", async () => {
    // A lazy() module that never resolves — simulates a chunk still loading
    // while the user is mid-scroll. Without a local Suspense boundary this
    // would bubble up and unmount every sibling LazySection.
    const NeverResolves = lazy(() => new Promise<never>(() => {}));

    render(
      <div>
        <LazySection>
          <div data-testid="sibling-a">first-section-stays-visible</div>
        </LazySection>
        <LazySection fallback={<div data-testid="slot-fallback">loading-slot</div>}>
          <NeverResolves />
        </LazySection>
        <LazySection>
          <div data-testid="sibling-b">third-section-stays-visible</div>
        </LazySection>
      </div>,
    );

    triggerIntersect();

    // Sibling sections must remain in the DOM even while the middle slot
    // is still suspended — this is what prevents the page collapsing to
    // height 0 and the scroll position resetting to the top.
    await waitFor(() => {
      expect(screen.getByTestId("sibling-a")).toBeInTheDocument();
      expect(screen.getByTestId("sibling-b")).toBeInTheDocument();
    });

    // The suspended slot shows the fallback (not the parent's), confirming
    // the local Suspense boundary actually caught the suspension.
    expect(screen.getByTestId("slot-fallback")).toBeInTheDocument();
  });
});
