import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Flame, TrendingUp, Zap, ChevronRight, AlertTriangle } from "lucide-react";
import { Creator } from "@/lib/data";

interface HeroSectionProps {
  creators: Creator[];
}

const HeroSection = ({ creators }: HeroSectionProps) => {
  const navigate = useNavigate();
  const [risingCreators, setRisingCreators] = useState<{ name: string; gain: number; id: string }[]>([]);
  const [gapBounce, setGapBounce] = useState(false);
  const prevGapRef = useRef<number | null>(null);

  const rank1 = creators.find((c) => c.rank === 1);
  const rank2 = creators.find((c) => c.rank === 2);
  const gap = rank1 && rank2 ? rank1.votes_count - rank2.votes_count : null;
  const isCloseRace = gap !== null && Math.abs(gap) <= 200;

  // Tug-of-war percentage
  const totalVotes = (rank1?.votes_count ?? 0) + (rank2?.votes_count ?? 0);
  const rank1Pct = totalVotes > 0 ? ((rank1?.votes_count ?? 0) / totalVotes) * 100 : 50;

  // Bounce animation when gap changes
  useEffect(() => {
    if (gap !== null && prevGapRef.current !== null && prevGapRef.current !== gap) {
      setGapBounce(true);
      const t = setTimeout(() => setGapBounce(false), 600);
      return () => clearTimeout(t);
    }
    prevGapRef.current = gap;
  }, [gap]);

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
          <Link to={`/creator/${rank1.id}`} className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer active:scale-95 transition-transform">
            <span className="text-[10px] text-yellow-400 font-bold">👑 1위</span>
            {(rank1.avatar_url?.startsWith("http") || rank1.avatar_url?.startsWith("/")) ? (
              <img src={rank1.avatar_url} alt={rank1.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-yellow-400/60" loading="eager" decoding="async" fetchPriority="high" width={48} height={48} />
            ) : (
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground ring-2 ring-yellow-400/60">
                {rank1.name.slice(0, 2)}
              </div>
            )}
            <span className="text-xs font-bold text-foreground truncate max-w-[80px]">{rank1.name}</span>
            <span className="text-[10px] text-neon-purple font-semibold">{rank1.votes_count.toLocaleString()}표</span>
          </Link>

          {/* VS + Gap */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className={`relative w-10 h-10 rounded-full flex items-center justify-center ${isCloseRace ? "animate-pulse" : ""}`}
              style={isCloseRace ? { boxShadow: "0 0 16px 4px hsl(var(--neon-red) / 0.6), 0 0 32px 8px hsl(var(--neon-red) / 0.3)" } : {}}
            >
              <span className="text-lg font-black gradient-text">VS</span>
            </div>
            {gap !== null && (
              <div className="glass-sm px-2 py-1 text-center">
                <div className="text-[9px] text-muted-foreground">격차</div>
                <div
                  className={`text-sm font-black text-neon-red transition-transform ${gapBounce ? "scale-125" : "scale-100"}`}
                  style={{ transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                >
                  {Math.abs(gap).toLocaleString()}표
                </div>
                <div className="text-[8px] text-muted-foreground/70 mt-0.5">
                  (방금 전 업데이트됨)
                </div>
              </div>
            )}
            {isCloseRace && (
              <div className="flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3 text-neon-red" />
                <span className="text-[9px] font-bold text-neon-red">역전 주의!</span>
              </div>
            )}
            <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
          </div>

          {/* Rank 2 */}
          <Link to={`/creator/${rank2.id}`} className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer active:scale-95 transition-transform">
            <span className="text-[10px] text-slate-300 font-bold">🥈 2위</span>
            {(rank2.avatar_url?.startsWith("http") || rank2.avatar_url?.startsWith("/")) ? (
              <img src={rank2.avatar_url} alt={rank2.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-400/60" />
            ) : (
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground ring-2 ring-slate-400/60">
                {rank2.name.slice(0, 2)}
              </div>
            )}
            <span className="text-xs font-bold text-foreground truncate max-w-[80px]">{rank2.name}</span>
            <span className="text-[10px] text-neon-cyan font-semibold">{rank2.votes_count.toLocaleString()}표</span>
          </Link>
        </div>

        {/* Tug-of-war progress bar */}
        <div className="space-y-1.5">
          <div className="text-[8px] text-muted-foreground text-center font-medium tracking-wide">투표 점유율</div>
          <div className="relative h-6 rounded-full overflow-hidden bg-muted/30">
            {/* Rank 1 bar */}
            <div
              className="absolute inset-y-0 left-0 rounded-l-full transition-all duration-700 ease-out flex items-center justify-start"
              style={{
                width: `${rank1Pct}%`,
                background: "linear-gradient(90deg, hsl(270 91% 65%), hsl(270 91% 55%))",
              }}
            >
              {rank1Pct >= 15 && (
                <span className="pl-2 text-[10px] font-bold text-white drop-shadow-sm whitespace-nowrap">
                  {rank1Pct.toFixed(1)}%
                </span>
              )}
            </div>
            {/* Rank 2 bar */}
            <div
              className="absolute inset-y-0 right-0 rounded-r-full transition-all duration-700 ease-out flex items-center justify-end"
              style={{
                width: `${100 - rank1Pct}%`,
                background: "linear-gradient(90deg, hsl(187 94% 52%), hsl(187 94% 42%))",
              }}
            >
              {(100 - rank1Pct) >= 15 && (
                <span className="pr-2 text-[10px] font-bold text-white drop-shadow-sm whitespace-nowrap">
                  {(100 - rank1Pct).toFixed(1)}%
                </span>
              )}
            </div>
            {/* Center indicator */}
            <div className="absolute inset-y-0 left-1/2 w-0.5 bg-foreground/40 -translate-x-1/2 z-10" />
          </div>
          <div className="flex justify-between text-[9px] font-semibold px-0.5">
            <span className="text-neon-purple">{rank1.name}</span>
            <span className="text-neon-cyan">{rank2.name}</span>
          </div>
        </div>

        {/* Primary CTA - 각 크리에이터별 투표 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/creator/" + rank1.id)}
            className="flex-1 gradient-primary text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="truncate max-w-[70px]">{rank1.name}</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
          <button
            onClick={() => navigate("/creator/" + rank2.id)}
            className="flex-1 gradient-primary text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="truncate max-w-[70px]">{rank2.name}</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
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
