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
const LazySection = ({ children, rootMargin = "200px", fallback = null }: LazySectionProps) => {
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

  return (
    <div ref={ref}>
      {mounted ? <Suspense fallback={fallback}>{children}</Suspense> : fallback}
    </div>
  );
};

export default LazySection;
