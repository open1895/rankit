import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  className?: string;
  size?: "sm" | "md";
}

const ThemeToggle = ({ className = "", size = "md" }: Props) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const dim = size === "sm" ? "w-8 h-8" : "w-9 h-9";
  const icon = size === "sm" ? "w-4 h-4" : "w-[18px] h-[18px]";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={isDark ? "라이트 모드" : "다크 모드"}
      className={`${dim} flex items-center justify-center rounded-full border border-glass-border bg-glass hover:bg-primary/10 transition-colors ${className}`}
    >
      {isDark ? (
        <Sun className={`${icon} text-yellow-400`} />
      ) : (
        <Moon className={`${icon} text-primary`} />
      )}
    </button>
  );
};

export default ThemeToggle;
