import { ShieldCheck, Sparkles } from "lucide-react";

interface RankitVerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const RankitVerifiedBadge = ({ size = "md", showLabel = true }: RankitVerifiedBadgeProps) => {
  const sizeMap = {
    sm: { icon: "w-3 h-3", text: "text-[9px]", padding: "px-1.5 py-0.5", gap: "gap-1" },
    md: { icon: "w-3.5 h-3.5", text: "text-[10px]", padding: "px-2 py-1", gap: "gap-1.5" },
    lg: { icon: "w-5 h-5", text: "text-sm", padding: "px-3 py-1.5", gap: "gap-2" },
  };
  const s = sizeMap[size];

  return (
    <span
      className={`inline-flex items-center ${s.gap} ${s.padding} rounded-full font-bold border select-none`}
      style={{
        background: "linear-gradient(135deg, hsl(187 94% 42% / 0.15), hsl(270 91% 65% / 0.15))",
        borderColor: "hsl(187 94% 42% / 0.4)",
        color: "hsl(187 94% 52%)",
      }}
      title="Rankit 공식 인증 크리에이터"
    >
      <ShieldCheck className={`${s.icon} shrink-0`} style={{ color: "hsl(187 94% 52%)" }} />
      {showLabel && <span className={s.text}>Rankit 인증</span>}
      <Sparkles className={`${s.icon} shrink-0 opacity-70`} style={{ color: "hsl(270 91% 65%)" }} />
    </span>
  );
};

export default RankitVerifiedBadge;
