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
          <linearGradient id="boltGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <text x="10" y="35" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="32" fill="currentColor" className="text-foreground">
          Rank
        </text>
        {/* Lightning bolt between Rank and it */}
        <g transform="translate(85, 5) scale(1.5)" filter="url(#glow)">
          <path d="M7 0 L2 9 L6 9 L3 16 L12 6 L8 6 L11 0 Z" fill="url(#boltGradient)" />
        </g>
        <text x="105" y="35" fontFamily="Arial, sans-serif" fontWeight="300" fontSize="32" fill="#A855F7" filter="url(#glow)">
          it
        </text>
        <path d="M135 15 L140 8 L145 15" stroke="#06B6D4" strokeWidth="3" fill="none" filter="url(#glow)" />
      </svg>
    </div>
  );
};

export default RankitLogo;
