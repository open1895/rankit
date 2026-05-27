import { useRef, useState, useEffect, ReactNode, Suspense } from "react";

interface LazySectionProps {
  children: ReactNode;
  rootMargin?: string;
  fallback?: ReactNode;
}

/**
 * Renders children only when the section enters or is near the viewport.
 * Once mounted, children stay mounted (no unmount on scroll away).
 * Wraps children in its own Suspense boundary so a lazy() chunk loading
 * here doesn't unmount sibling sections (which causes scroll jumps).
 */
const DefaultFallback = () => (
  <div
    aria-hidden="true"
    style={{ minHeight: 200 }}
    className="bg-background"
  />
);

const LazySection = ({ children, rootMargin = "200px", fallback }: LazySectionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  const fb = fallback ?? <DefaultFallback />;

  return (
    <div ref={ref} className="bg-background">
      {mounted ? <Suspense fallback={fb}>{children}</Suspense> : fb}
    </div>
  );
};

export default LazySection;
