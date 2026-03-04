import { getFanLevel, calculateFanPoints, type FanActivityPoints } from "@/lib/fanLevel";

interface FanLevelBadgeProps {
  activity?: FanActivityPoints;
  points?: number;
  size?: "sm" | "md";
}

const FanLevelBadge = ({ activity, points: directPoints, size = "sm" }: FanLevelBadgeProps) => {
  const points = directPoints ?? (activity ? calculateFanPoints(activity) : 0);
  const level = getFanLevel(points);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold border shrink-0 ${level.color} ${
        size === "sm" ? "text-[9px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
      }`}
    >
      <span>{level.emoji}</span>
      <span>Lv.{level.level}</span>
    </span>
  );
};

export default FanLevelBadge;
