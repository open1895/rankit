interface FanBadgeProps {
  voteCount: number;
  postCount: number;
}

function getBadge(voteCount: number, postCount: number): { label: string; color: string } | null {
  const total = voteCount + postCount;

  if (voteCount >= 50) return { label: "열혈팬", color: "bg-neon-purple/20 text-neon-purple" };
  if (postCount >= 30) return { label: "전략가", color: "bg-neon-cyan/20 text-neon-cyan" };
  if (total >= 20) return { label: "서포터", color: "bg-green-500/20 text-green-400" };
  if (total >= 5) return { label: "응원단", color: "bg-yellow-500/20 text-yellow-400" };
  return null;
}

const FanBadge = ({ voteCount, postCount }: FanBadgeProps) => {
  const badge = getBadge(voteCount, postCount);
  if (!badge) return null;

  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${badge.color}`}>
      {badge.label}
    </span>
  );
};

export default FanBadge;
