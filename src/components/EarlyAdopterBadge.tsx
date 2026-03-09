import { Sparkles } from "lucide-react";

interface EarlyAdopterBadgeProps {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const EarlyAdopterBadge = ({ size = "md", showLabel = true }: EarlyAdopterBadgeProps) => {
  const sizeClasses = {
    sm: "text-[9px] px-1.5 py-0.5 gap-0.5",
    md: "text-[11px] px-2.5 py-1 gap-1",
    lg: "text-xs px-3 py-1.5 gap-1.5",
  };

  const iconSize = {
    sm: "w-2.5 h-2.5",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-orange-400/20 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.3)] animate-pulse-slow ${sizeClasses[size]}`}
    >
      <Sparkles className={iconSize[size]} />
      {showLabel && "얼리어답터"}
    </span>
  );
};

export default EarlyAdopterBadge;
