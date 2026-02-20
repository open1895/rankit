import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Flame, TrendingUp, Zap, ChevronRight } from "lucide-react";
import { Creator } from "@/lib/data";

interface HeroSectionProps {
  creators: Creator[];
}

const HeroSection = ({ creators }: HeroSectionProps) => {
  const navigate = useNavigate();
  const [risingCreators, setRisingCreators] = useState<{ name: string; gain: number; id: string }[]>([]);

  const rank1 = creators.find((c) => c.rank === 1);
  const rank2 = creators.find((c) => c.rank === 2);
  const gap = rank1 && rank2 ? rank1.votes_count - rank2.votes_count : null;

  // Simulate "rising fast" creators (top 5 non-top3)
  useEffect(() => {
    const candidates = creators.filter((c) => c.rank > 3).slice(0, 3);
    setRisingCreators(
      candidates.map((c) => ({
        name: c.name,
        id: c.id,
        gain: Math.floor(Math.random() * 150 + 20),
      }))
    );
  }, [creators]);

  if (!rank1 || !rank2) return null;

  return (
    <section className="space-y-4">
      {/* Live Rank Battle Banner */}
      <div className="relative overflow-hidden glass neon-glow-purple p-5 text-center space-y-3">
        {/* Animated BG pulse */}
        <div className="absolute inset-0 gradient-primary opacity-5 animate-pulse pointer-events-none" />

        <div className="inline-flex items-center gap-1.5 glass-sm px-3 py-1 text-[10px] font-bold text-neon-red tracking-widest uppercase">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-red/80 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          LIVE 순위 경쟁
        </div>

        {/* VS Battle Display */}
        <div className="flex items-center justify-center gap-3">
          {/* Rank 1 */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <span className="text-[10px] text-yellow-400 font-bold">👑 1위</span>
            {rank1.avatar_url?.startsWith("http") ? (
              <img src={rank1.avatar_url} alt={rank1.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-yellow-400/60" />
            ) : (
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground ring-2 ring-yellow-400/60">
                {rank1.name.slice(0, 2)}
              </div>
            )}
            <span className="text-xs font-bold text-foreground truncate max-w-[80px]">{rank1.name}</span>
            <span className="text-[10px] text-neon-purple font-semibold">{rank1.votes_count.toLocaleString()}표</span>
          </div>

          {/* VS + Gap */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-lg font-black gradient-text">VS</span>
            {gap !== null && (
              <div className="glass-sm px-2 py-1 text-center">
                <div className="text-[9px] text-muted-foreground">격차</div>
                <div className="text-sm font-black text-neon-red">{gap.toLocaleString()}표</div>
              </div>
            )}
            <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
          </div>

          {/* Rank 2 */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <span className="text-[10px] text-slate-300 font-bold">🥈 2위</span>
            {rank2.avatar_url?.startsWith("http") ? (
              <img src={rank2.avatar_url} alt={rank2.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-400/60" />
            ) : (
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground ring-2 ring-slate-400/60">
                {rank2.name.slice(0, 2)}
              </div>
            )}
            <span className="text-xs font-bold text-foreground truncate max-w-[80px]">{rank2.name}</span>
            <span className="text-[10px] text-neon-cyan font-semibold">{rank2.votes_count.toLocaleString()}표</span>
          </div>
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => navigate("/creator/" + rank2.id)}
          className="w-full gradient-primary text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
        >
          <Flame className="w-4 h-4" />
          지금 투표하기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Rising Creators */}
      {risingCreators.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 px-1">
            <TrendingUp className="w-3.5 h-3.5 text-neon-cyan" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">급상승 중</span>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {risingCreators.map((rc) => (
              <Link
                key={rc.id}
                to={`/creator/${rc.id}`}
                className="glass-sm shrink-0 px-3 py-2 flex items-center gap-2 hover:border-neon-cyan/40 transition-all"
              >
                <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground">
                  {rc.name.slice(0, 1)}
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-foreground truncate max-w-[80px]">{rc.name}</div>
                  <div className="text-[10px] text-neon-cyan font-medium">+{rc.gain}표 / 10분</div>
                </div>
                <span className="text-[9px] bg-neon-red/15 text-neon-red px-1.5 py-0.5 rounded-full font-bold border border-neon-red/20">
                  🔥 급상승
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
