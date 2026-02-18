interface RankitLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: "w-6 h-6", arrow: "text-[10px]", text: "text-sm", gap: "gap-1.5" },
  md: { icon: "w-8 h-8", arrow: "text-xs", text: "text-lg", gap: "gap-2" },
  lg: { icon: "w-12 h-12", arrow: "text-sm", text: "text-2xl", gap: "gap-2.5" },
  xl: { icon: "w-16 h-16", arrow: "text-base", text: "text-4xl", gap: "gap-3" },
};

const RankitLogo = ({ size = "md", showText = true, className = "" }: RankitLogoProps) => {
  const s = sizeMap[size];

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      {/* Icon: neon arrow in gradient box */}
      <div className={`${s.icon} rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/30 relative overflow-hidden`}>
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10" />
        {/* Arrow symbol */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-[60%] h-[60%] relative z-10"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5" className="text-primary-foreground" />
          <path d="M5 12l7-7 7 7" className="text-primary-foreground" />
          {/* Crown accent on top */}
          <path d="M8 5l4-3 4 3" className="text-primary-foreground" strokeWidth="1.5" />
        </svg>
      </div>
      {showText && (
        <h1 className={`${s.text} font-extrabold tracking-tight leading-none`}>
          <span className="gradient-text">Rank</span>
          <span className="text-foreground font-light">it</span>
        </h1>
      )}
    </div>
  );
};

export default RankitLogo;
