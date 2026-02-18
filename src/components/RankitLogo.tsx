interface RankitLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const scaleMap = {
  sm: "scale-[0.6]",
  md: "scale-[0.8]",
  lg: "scale-100",
  xl: "scale-[1.3]",
};

const RankitLogo = ({ size = "md", className = "" }: RankitLogoProps) => {
  return (
    <div className={`flex items-center ${className}`} style={{ transformOrigin: "left center" }}>
      <svg
        width="180"
        height="50"
        viewBox="0 0 180 50"
        xmlns="http://www.w3.org/2000/svg"
        className={`${scaleMap[size]} origin-left`}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <text x="10" y="35" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="32" fill="currentColor" className="text-foreground">
          Rank
        </text>
        <text x="95" y="35" fontFamily="Arial, sans-serif" fontWeight="300" fontSize="32" fill="#A855F7" filter="url(#glow)">
          it
        </text>
        <path d="M125 15 L130 8 L135 15" stroke="#06B6D4" strokeWidth="3" fill="none" filter="url(#glow)" />
      </svg>
    </div>
  );
};

export default RankitLogo;
