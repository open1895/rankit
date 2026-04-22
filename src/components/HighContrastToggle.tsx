import { Contrast } from "lucide-react";
import { useHighContrast } from "@/hooks/useHighContrast";

interface Props {
  className?: string;
  size?: "sm" | "md";
}

const HighContrastToggle = ({ className = "", size = "md" }: Props) => {
  const { highContrast, toggle } = useHighContrast();
  const dim = size === "sm" ? "w-8 h-8" : "w-9 h-9";
  const icon = size === "sm" ? "w-4 h-4" : "w-[18px] h-[18px]";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={highContrast}
      aria-label={highContrast ? "고대비 모드 끄기" : "고대비 모드 켜기"}
      title={highContrast ? "고대비 모드 ON" : "고대비 모드 OFF"}
      className={`${dim} flex items-center justify-center rounded-full border border-glass-border bg-glass hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        highContrast ? "ring-2 ring-primary" : ""
      } ${className}`}
    >
      <Contrast className={`${icon} ${highContrast ? "text-primary" : "text-foreground/70"}`} />
    </button>
  );
};

export default HighContrastToggle;
