interface RankitLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeStyles = {
  sm: { fontSize: "1.25rem", boltSize: "0.9rem", gap: "1px" },
  md: { fontSize: "1.6rem", boltSize: "1.1rem", gap: "2px" },
  lg: { fontSize: "2rem", boltSize: "1.4rem", gap: "2px" },
  xl: { fontSize: "2.6rem", boltSize: "1.8rem", gap: "3px" },
};

const RankitLogo = ({ size = "md", className = "" }: RankitLogoProps) => {
  const showTagline = size === "lg" || size === "xl";
  const s = sizeStyles[size];

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center" style={{ gap: s.gap }}>
        {/* "Rank" - solid foreground */}
        <span
          className="font-black tracking-tight text-foreground"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: s.fontSize,
            lineHeight: 1,
          }}
        >
          Rank
        </span>

        {/* Lightning bolt - neon cyan/purple */}
        <span
          className="inline-flex items-center"
          style={{
            fontSize: s.boltSize,
            lineHeight: 1,
            filter: "drop-shadow(0 0 6px hsl(187 94% 42% / 0.7)) drop-shadow(0 0 12px hsl(270 91% 60% / 0.4))",
            background: "linear-gradient(180deg, hsl(187 94% 50%), hsl(270 91% 60%))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          ⚡
        </span>

        {/* "it" - neon purple glow */}
        <span
          className="font-light tracking-tight"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: s.fontSize,
            lineHeight: 1,
            color: "hsl(270 91% 60%)",
            textShadow:
              "0 0 7px hsl(270 91% 60% / 0.6), 0 0 20px hsl(270 91% 60% / 0.3), 0 0 40px hsl(270 91% 60% / 0.15)",
          }}
        >
          it
        </span>

        {/* Rising arrow - neon cyan */}
        <span
          className="font-bold"
          style={{
            fontSize: `calc(${s.fontSize} * 0.6)`,
            lineHeight: 1,
            color: "hsl(187 94% 45%)",
            textShadow:
              "0 0 6px hsl(187 94% 45% / 0.6), 0 0 16px hsl(187 94% 45% / 0.25)",
            marginLeft: "2px",
            alignSelf: "flex-start",
            marginTop: "2px",
          }}
        >
          ▲
        </span>
      </div>

      {showTagline && (
        <span className="text-[9px] sm:text-[10px] tracking-widest uppercase text-muted-foreground font-medium ml-0.5 -mt-0.5">
          The Creator Competition Platform
        </span>
      )}
    </div>
  );
};

export default RankitLogo;
