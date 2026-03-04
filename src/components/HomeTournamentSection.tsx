import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Swords, ChevronRight, Zap, Trophy } from "lucide-react";

interface ActiveMatch {
  id: string;
  creator_a: { name: string; avatar_url: string };
  creator_b: { name: string; avatar_url: string };
  votes_a: number;
  votes_b: number;
  round: number;
}

const ROUND_LABELS: Record<number, string> = { 16: "16강", 8: "8강", 4: "4강", 2: "결승" };

const HomeTournamentSection = () => {
  const [tournamentTitle, setTournamentTitle] = useState("");
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: t } = await supabase
        .from("tournaments")
        .select("id, title, round")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!t) { setLoading(false); return; }
      setTournamentTitle(t.title);

      const { data: matches } = await supabase
        .from("tournament_matches")
        .select("id, creator_a_id, creator_b_id, votes_a, votes_b, round, is_completed")
        .eq("tournament_id", t.id)
        .eq("round", t.round)
        .eq("is_completed", false)
        .order("match_order", { ascending: true })
        .limit(3);

      if (!matches || matches.length === 0) { setLoading(false); return; }

      const ids = new Set<string>();
      matches.forEach((m) => { ids.add(m.creator_a_id); ids.add(m.creator_b_id); });

      const { data: creators } = await supabase
        .from("creators")
        .select("id, name, avatar_url")
        .in("id", Array.from(ids));

      const cMap = new Map((creators || []).map((c) => [c.id, c]));

      setActiveMatches(
        matches.map((m) => ({
          id: m.id,
          creator_a: cMap.get(m.creator_a_id) || { name: "???", avatar_url: "" },
          creator_b: cMap.get(m.creator_b_id) || { name: "???", avatar_url: "" },
          votes_a: m.votes_a,
          votes_b: m.votes_b,
          round: m.round,
        }))
      );
      setLoading(false);
    };

    fetch();
  }, []);

  if (loading || activeMatches.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold gradient-text">크리에이터 토너먼트</h2>
        </div>
        <Link to="/tournament" className="flex items-center gap-0.5 text-[11px] text-primary font-medium hover:underline">
          전체 보기 <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {tournamentTitle && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold animate-pulse">
            <Zap className="w-3 h-3" /> LIVE
          </span>
          <span className="text-xs font-medium text-muted-foreground">{tournamentTitle}</span>
        </div>
      )}

      <div className="space-y-2">
        {activeMatches.map((match) => {
          const total = match.votes_a + match.votes_b;
          const pctA = total > 0 ? Math.round((match.votes_a / total) * 100) : 50;

          return (
            <Link key={match.id} to="/tournament" className="block">
              <div className="glass glass-hover p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {match.creator_a.avatar_url ? (
                      <img src={match.creator_a.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-primary/30" />
                    ) : (
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">{match.creator_a.name.slice(0, 1)}</div>
                    )}
                    <span className="text-xs font-bold truncate">{match.creator_a.name}</span>
                  </div>

                  <div className="shrink-0 px-2">
                    <span className="text-[10px] font-bold text-muted-foreground glass-sm px-2 py-0.5 rounded-full">VS</span>
                  </div>

                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-xs font-bold truncate">{match.creator_b.name}</span>
                    {match.creator_b.avatar_url ? (
                      <img src={match.creator_b.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-secondary/30" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-secondary-foreground">{match.creator_b.name.slice(0, 1)}</div>
                    )}
                  </div>
                </div>

                {total > 0 && (
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted/50">
                    <div className="bg-primary transition-all duration-500" style={{ width: `${pctA}%` }} />
                    <div className="bg-secondary transition-all duration-500" style={{ width: `${100 - pctA}%` }} />
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{match.votes_a}표 ({pctA}%)</span>
                  <span className="font-medium">{ROUND_LABELS[match.round] || `${match.round}강`}</span>
                  <span>{match.votes_b}표 ({100 - pctA}%)</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default HomeTournamentSection;
