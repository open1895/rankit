import { useState, useEffect, useCallback } from "react";
import { Sun, Moon } from "lucide-react";

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return !document.documentElement.classList.contains("light");
    }
    return true;
  });

  const [isAnimating, setIsAnimating] = useState(false);

  const toggle = useCallback(() => {
    setIsAnimating(true);
    setIsDark((v) => !v);
    setTimeout(() => setIsAnimating(false), 600);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <button
      onClick={toggle}
      className="relative p-2.5 rounded-xl glass-sm border border-glass-border hover:border-neon-purple/50 transition-all duration-300 overflow-hidden group"
      aria-label="테마 전환"
    >
      {/* Background glow on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: isDark
            ? 'radial-gradient(circle, hsl(var(--neon-cyan) / 0.15), transparent 70%)'
            : 'radial-gradient(circle, hsl(var(--neon-purple) / 0.15), transparent 70%)',
        }}
      />

      <div className="relative w-4 h-4">
        {/* Sun icon */}
        <Sun
          className={`absolute inset-0 w-4 h-4 text-neon-cyan transition-all duration-500 ease-out ${
            isDark
              ? "opacity-100 rotate-0 scale-100"
              : "opacity-0 rotate-90 scale-50"
          }`}
        />
        {/* Moon icon */}
        <Moon
          className={`absolute inset-0 w-4 h-4 text-neon-purple transition-all duration-500 ease-out ${
            !isDark
              ? "opacity-100 rotate-0 scale-100"
              : "opacity-0 -rotate-90 scale-50"
          }`}
        />
      </div>

      {/* Ripple effect on click */}
      {isAnimating && (
        <span className="absolute inset-0 animate-theme-ripple rounded-xl pointer-events-none"
          style={{
            background: isDark
              ? 'radial-gradient(circle, hsl(var(--neon-purple) / 0.3), transparent 70%)'
              : 'radial-gradient(circle, hsl(var(--neon-cyan) / 0.3), transparent 70%)',
          }}
        />
      )}
    </button>
  );
};

export default ThemeToggle;
