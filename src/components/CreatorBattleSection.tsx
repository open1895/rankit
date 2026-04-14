import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Swords, Vote, Eye, GitCompareArrows, Zap, Clock } from "lucide-react";
import { toast } from "sonner";

interface BattleCreator {
  id: string;
  name: string;
  avatar_url: string;
  category: string;
  votes_count: number;
  rankit_score: number;
}

interface Battle {
  id: string;
  creator_a_id: string;
  creator_b_id: string;
  votes_a: number;
  votes_b: number;
  status: string;
  featured: boolean;
  ends_at: string;
  creator_a?: BattleCreator;
  creator_b?: BattleCreator;
}

function useCountdownStr(endsAt: string) {
  const [text, setText] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setExpired(true); setText("종료"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setText(h > 0 ? `${h}시간 ${m}분` : `${m}분 ${s}초`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return { text, expired };
}

const BattleCountdown = ({ endsAt }: { endsAt: string }) => {
  const { text } = useCountdownStr(endsAt);
  return (
    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
      <Clock className="w-3 h-3" /> {text}
    </span>
  );
};

const CreatorBattleSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchBattles = async () => {
      const { data, error } = await supabase
        .from("battles")
        .select("*")
        .eq("status", "active")
        .gt("ends_at", new Date().toISOString())
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3);

      if (error || !data || data.length === 0) {
        setLoading(false);
        return;
      }

      const creatorIds = new Set<string>();
      data.forEach((b: any) => {
        creatorIds.add(b.creator_a_id);
        creatorIds.add(b.creator_b_id);
      });

      const { data: creators } = await supabase
        .from("creators")
        .select("id, name, avatar_url, category, votes_count, rankit_score")
        .in("id", Array.from(creatorIds));

      const creatorMap = new Map((creators || []).map((c: any) => [c.id, c]));

      setBattles(
        data.map((b: any) => ({
          ...b,
          creator_a: creatorMap.get(b.creator_a_id),
          creator_b: creatorMap.get(b.creator_b_id),
        }))
      );
      setLoading(false);
    };

    fetchBattles();

    const channel = supabase
      .channel("battles-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "battles" }, (payload) => {
        const updated = payload.new as any;
        setBattles((prev) =>
          prev.map((b) => (b.id === updated.id ? { ...b, votes_a: updated.votes_a, votes_b: updated.votes_b, status: updated.status } : b))
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Check expiration every second and hide expired battles
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      battles.forEach((b) => {
        if (new Date(b.ends_at).getTime() <= now && !hiddenIds.has(b.id)) {
          setHiddenIds((prev) => new Set(prev).add(b.id));
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [battles, hiddenIds]);

  const handleVote = async (battleId: string, creatorId: string) => {
    if (!user) {
      toast.error("투표하려면 로그인이 필요합니다.");
      navigate("/auth");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) {
      toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
      navigate("/auth");
      return;
    }

    setVotingId(battleId);
    const { data, error } = await supabase.functions.invoke("battle-vote", {
      body: { battle_id: battleId, creator_id: creatorId },
    });

    setVotingId(null);

    if (error) {
      try {
        if (error.context instanceof Response) {
          const errData = await error.context.json();
          const msg = errData?.message || "투표에 실패했습니다.";
          toast.error(msg);
          if (msg.includes("인증") || msg.includes("로그인")) navigate("/auth");
        } else {
          toast.error("투표에 실패했습니다.");
        }
      } catch {
        toast.error("투표에 실패했습니다.");
      }
      return;
    }

    if (data?.error) {
      toast.error(data.message);
      return;
    }

    toast.success("배틀 투표 완료! 🔥");
  };

  const visibleBattles = battles.filter((b) => !hiddenIds.has(b.id));

  if (loading || visibleBattles.length === 0) return null;

  const featured = visibleBattles[0];
  const totalVotes = featured.votes_a + featured.votes_b;
  const pctA = totalVotes > 0 ? Math.round((featured.votes_a / totalVotes) * 100) : 50;
  const pctB = 100 - pctA;

  return (
    <section className="py-6">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-2 mb-4">
          <Swords className="w-5 h-5 text-destructive" />
          <h2 className="text-lg font-black gradient-text">🔥 Creator Battle</h2>
        </div>

        {/* Featured Battle */}
        <div className="glass rounded-2xl p-5 border border-destructive/20 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
              LIVE BATTLE
            </span>
            <div className="flex items-center gap-2">
              <BattleCountdown endsAt={featured.ends_at} />
              <span className="text-[10px] text-muted-foreground">
                {totalVotes}표 참여 중
              </span>
            </div>
          </div>

          {/* VS Layout */}
          <div className="flex items-center gap-3">
            {/* Creator A */}
            <div className="flex-1 text-center space-y-2">
              <Link to={`/creator/${featured.creator_a?.id}`}>
                <Avatar className="w-16 h-16 mx-auto ring-2 ring-neon-cyan/50 hover:scale-105 transition-transform">
                  <AvatarImage src={featured.creator_a?.avatar_url} />
                  <AvatarFallback>{featured.creator_a?.name?.[0]}</AvatarFallback>
                </Avatar>
              </Link>
              <p className="text-sm font-bold truncate">{featured.creator_a?.name}</p>
              <p className="text-[10px] text-muted-foreground">{featured.creator_a?.category}</p>
              <Button
                size="sm"
                onClick={() => handleVote(featured.id, featured.creator_a_id)}
                disabled={votingId === featured.id}
                className="text-xs w-full gradient-primary text-primary-foreground"
              >
                <Vote className="w-3 h-3 mr-1" />
                투표
              </Button>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-destructive" />
              </div>
              <span className="text-[10px] font-black text-destructive">VS</span>
            </div>

            {/* Creator B */}
            <div className="flex-1 text-center space-y-2">
              <Link to={`/creator/${featured.creator_b?.id}`}>
                <Avatar className="w-16 h-16 mx-auto ring-2 ring-neon-purple/50 hover:scale-105 transition-transform">
                  <AvatarImage src={featured.creator_b?.avatar_url} />
                  <AvatarFallback>{featured.creator_b?.name?.[0]}</AvatarFallback>
                </Avatar>
              </Link>
              <p className="text-sm font-bold truncate">{featured.creator_b?.name}</p>
              <p className="text-[10px] text-muted-foreground">{featured.creator_b?.category}</p>
              <Button
                size="sm"
                onClick={() => handleVote(featured.id, featured.creator_b_id)}
                disabled={votingId === featured.id}
                className="text-xs w-full gradient-primary text-primary-foreground"
              >
                <Vote className="w-3 h-3 mr-1" />
                투표
              </Button>
            </div>
          </div>

          {/* Vote Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-neon-cyan">{pctA}%</span>
              <span className="text-neon-purple">{pctB}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-neon-cyan to-neon-cyan/70 transition-all duration-700"
                style={{ width: `${pctA}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-neon-purple/70 to-neon-purple transition-all duration-700"
                style={{ width: `${pctB}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{featured.votes_a}표</span>
              <span>{featured.votes_b}표</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Link to="/predictions">
              <Button variant="outline" size="sm" className="w-full text-[11px]">
                🎯 예측
              </Button>
            </Link>
            <Link to={`/compare?a=${featured.creator_a_id}&b=${featured.creator_b_id}`}>
              <Button variant="outline" size="sm" className="w-full text-[11px]">
                <GitCompareArrows className="w-3 h-3 mr-1" />
                비교
              </Button>
            </Link>
            <Link to="/battle">
              <Button variant="outline" size="sm" className="w-full text-[11px]">
                <Eye className="w-3 h-3 mr-1" />
                더보기
              </Button>
            </Link>
          </div>
        </div>

        {/* Other Battles */}
        {visibleBattles.length > 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {visibleBattles.slice(1).map((battle) => {
              const total = battle.votes_a + battle.votes_b;
              const pA = total > 0 ? Math.round((battle.votes_a / total) * 100) : 50;
              return (
                <div key={battle.id} className="glass rounded-xl p-3 space-y-2 border border-border/30">
                  <div className="flex items-center justify-between">
                    <BattleCountdown endsAt={battle.ends_at} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={battle.creator_a?.avatar_url} />
                        <AvatarFallback>{battle.creator_a?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold truncate">{battle.creator_a?.name}</span>
                    </div>
                    <Zap className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span className="text-xs font-bold truncate">{battle.creator_b?.name}</span>
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={battle.creator_b?.avatar_url} />
                        <AvatarFallback>{battle.creator_b?.name?.[0]}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                    <div className="h-full bg-neon-cyan transition-all" style={{ width: `${pA}%` }} />
                    <div className="h-full bg-neon-purple transition-all" style={{ width: `${100 - pA}%` }} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 text-[10px] h-7" onClick={() => handleVote(battle.id, battle.creator_a_id)} disabled={votingId === battle.id}>
                      {battle.creator_a?.name?.split(" ")[0]}
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1 text-[10px] h-7" onClick={() => handleVote(battle.id, battle.creator_b_id)} disabled={votingId === battle.id}>
                      {battle.creator_b?.name?.split(" ")[0]}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center mt-3">
          <Link to="/battle" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            모든 배틀 보기 →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CreatorBattleSection;
