import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return !document.documentElement.classList.contains("light");
    }
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      setIsDark(false);
    }
  }, []);

  return (
    <button
      onClick={() => setIsDark((v) => !v)}
      className="p-2 rounded-xl glass-sm border border-glass-border hover:border-neon-purple/50 transition-all"
      aria-label="테마 전환"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-neon-cyan" />
      ) : (
        <Moon className="w-4 h-4 text-neon-purple" />
      )}
    </button>
  );
};

export default ThemeToggle;
