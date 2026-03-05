import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Swords, Vote, Zap, GitCompareArrows, Share2, Users, TrendingUp, Star, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface BattleCreator {
  id: string;
  name: string;
  avatar_url: string;
  category: string;
  votes_count: number;
  rankit_score: number;
  youtube_subscribers: number;
  instagram_followers: number;
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
  created_at: string;
  creator_a?: BattleCreator;
  creator_b?: BattleCreator;
}

const BattlePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [completedBattles, setCompletedBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBattles = async () => {
      const [activeRes, completedRes] = await Promise.all([
        supabase.from("battles").select("*").eq("status", "active").order("featured", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("battles").select("*").eq("status", "completed").order("created_at", { ascending: false }).limit(10),
      ]);

      const allBattles = [...(activeRes.data || []), ...(completedRes.data || [])];
      const creatorIds = new Set<string>();
      allBattles.forEach((b: any) => { creatorIds.add(b.creator_a_id); creatorIds.add(b.creator_b_id); });

      const { data: creators } = await supabase
        .from("creators")
        .select("id, name, avatar_url, category, votes_count, rankit_score, youtube_subscribers, instagram_followers")
        .in("id", Array.from(creatorIds));

      const map = new Map((creators || []).map((c: any) => [c.id, c]));
      const enrich = (b: any) => ({ ...b, creator_a: map.get(b.creator_a_id), creator_b: map.get(b.creator_b_id) });

      setBattles((activeRes.data || []).map(enrich));
      setCompletedBattles((completedRes.data || []).map(enrich));
      setLoading(false);
    };
    fetchBattles();

    const channel = supabase
      .channel("battle-page-rt")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "battles" }, (payload) => {
        const u = payload.new as any;
        setBattles((prev) => prev.map((b) => (b.id === u.id ? { ...b, votes_a: u.votes_a, votes_b: u.votes_b, status: u.status } : b)));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleVote = async (battleId: string, creatorId: string) => {
    if (!user) { toast.error("투표하려면 로그인이 필요합니다."); navigate("/auth"); return; }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) { toast.error("세션이 만료되었습니다. 다시 로그인해주세요."); navigate("/auth"); return; }
    setVotingId(battleId);
    const { data, error } = await supabase.functions.invoke("battle-vote", { body: { battle_id: battleId, creator_id: creatorId } });
    setVotingId(null);
    if (error) {
      try {
        const e = error.context instanceof Response ? await error.context.json() : null;
        const msg = e?.message || "투표에 실패했습니다.";
        toast.error(msg);
        if (msg.includes("인증") || msg.includes("로그인")) navigate("/auth");
      } catch {
        toast.error("투표에 실패했습니다.");
      }
      return;
    }
    if (data?.error) { toast.error(data.message); return; }
    toast.success("배틀 투표 완료! 🔥");
  };

  const handleShare = (battle: Battle) => {
    const text = `누가 더 영향력 있을까? ${battle.creator_a?.name} vs ${battle.creator_b?.name} on Rankit!`;
    if (navigator.share) {
      navigator.share({ title: "Creator Battle - Rankit", text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      toast.success("링크가 복사되었습니다!");
    }
  };

  const BattleCard = ({ battle, isCompleted = false }: { battle: Battle; isCompleted?: boolean }) => {
    const total = battle.votes_a + battle.votes_b;
    const pctA = total > 0 ? Math.round((battle.votes_a / total) * 100) : 50;
    const pctB = 100 - pctA;
    const a = battle.creator_a;
    const b = battle.creator_b;
    const winner = isCompleted ? (battle.votes_a > battle.votes_b ? "a" : battle.votes_b > battle.votes_a ? "b" : null) : null;

    return (
      <Card className="overflow-hidden border-border/30">
        <CardContent className="p-5 space-y-4">
          {battle.featured && !isCompleted && (
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider">Featured Battle</span>
            </div>
          )}
          {isCompleted && (
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted px-2 py-0.5 rounded-full">종료됨</span>
          )}

          <div className="flex items-center gap-4">
            <div className={`flex-1 text-center space-y-2 ${winner === "a" ? "ring-2 ring-yellow-400 rounded-xl p-2" : ""}`}>
              <Link to={`/creator/${a?.id}`}>
                <Avatar className="w-14 h-14 sm:w-18 sm:h-18 mx-auto ring-2 ring-neon-cyan/40 hover:scale-105 transition-transform">
                  <AvatarImage src={a?.avatar_url} />
                  <AvatarFallback>{a?.name?.[0]}</AvatarFallback>
                </Avatar>
              </Link>
              <p className="text-sm font-bold truncate">{a?.name}</p>
              <p className="text-[10px] text-muted-foreground">{a?.category}</p>
              <div className="space-y-0.5 text-[10px] text-muted-foreground">
                <p><Users className="w-3 h-3 inline mr-0.5" />{(a?.votes_count || 0).toLocaleString()}표</p>
                <p><TrendingUp className="w-3 h-3 inline mr-0.5" />점수 {Math.round(a?.rankit_score || 0)}</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
                <Zap className="w-6 h-6 text-destructive" />
              </div>
              <span className="text-xs font-black text-destructive">VS</span>
            </div>

            <div className={`flex-1 text-center space-y-2 ${winner === "b" ? "ring-2 ring-yellow-400 rounded-xl p-2" : ""}`}>
              <Link to={`/creator/${b?.id}`}>
                <Avatar className="w-14 h-14 sm:w-18 sm:h-18 mx-auto ring-2 ring-neon-purple/40 hover:scale-105 transition-transform">
                  <AvatarImage src={b?.avatar_url} />
                  <AvatarFallback>{b?.name?.[0]}</AvatarFallback>
                </Avatar>
              </Link>
              <p className="text-sm font-bold truncate">{b?.name}</p>
              <p className="text-[10px] text-muted-foreground">{b?.category}</p>
              <div className="space-y-0.5 text-[10px] text-muted-foreground">
                <p><Users className="w-3 h-3 inline mr-0.5" />{(b?.votes_count || 0).toLocaleString()}표</p>
                <p><TrendingUp className="w-3 h-3 inline mr-0.5" />점수 {Math.round(b?.rankit_score || 0)}</p>
              </div>
            </div>
          </div>

          {/* Vote Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-neon-cyan">{pctA}%</span>
              <span className="text-muted-foreground text-[10px]">{total}표</span>
              <span className="text-neon-purple">{pctB}%</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden flex">
              <div className="h-full bg-gradient-to-r from-neon-cyan to-neon-cyan/60 transition-all duration-700 flex items-center justify-end pr-1" style={{ width: `${pctA}%` }}>
                {pctA > 15 && <span className="text-[9px] font-bold text-background">{battle.votes_a}</span>}
              </div>
              <div className="h-full bg-gradient-to-r from-neon-purple/60 to-neon-purple transition-all duration-700 flex items-center pl-1" style={{ width: `${pctB}%` }}>
                {pctB > 15 && <span className="text-[9px] font-bold text-background">{battle.votes_b}</span>}
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isCompleted ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button size="sm" className="text-xs gradient-primary text-primary-foreground" onClick={() => handleVote(battle.id, battle.creator_a_id)} disabled={votingId === battle.id}>
                <Vote className="w-3 h-3 mr-1" />{a?.name?.split(" ")[0]}
              </Button>
              <Button size="sm" className="text-xs gradient-primary text-primary-foreground" onClick={() => handleVote(battle.id, battle.creator_b_id)} disabled={votingId === battle.id}>
                <Vote className="w-3 h-3 mr-1" />{b?.name?.split(" ")[0]}
              </Button>
              <Link to={`/compare?a=${a?.id}&b=${b?.id}`}>
                <Button variant="outline" size="sm" className="w-full text-xs"><GitCompareArrows className="w-3 h-3 mr-1" />비교</Button>
              </Link>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => handleShare(battle)}>
                <Share2 className="w-3 h-3 mr-1" />공유
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to={`/compare?a=${a?.id}&b=${b?.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs"><GitCompareArrows className="w-3 h-3 mr-1" />비교하기</Button>
              </Link>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => handleShare(battle)}>
                <Share2 className="w-3 h-3 mr-1" />공유
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead title="Creator Battle - Rankit" description="크리에이터 배틀! 누가 더 영향력 있을까? 투표하고 예측하세요." path="/battle" />

      <div className="container max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 glass rounded-xl hover:bg-muted/50 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">
              <Swords className="w-5 h-5 text-destructive" />
              <span className="gradient-text">Creator Battle</span>
            </h1>
            <p className="text-xs text-muted-foreground">매일 새로운 크리에이터 대결! 투표하고 승자를 예측하세요</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="glass rounded-2xl h-48 animate-pulse" />)}
          </div>
        ) : battles.length === 0 ? (
          <div className="text-center py-16 glass rounded-2xl">
            <Swords className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">진행 중인 배틀이 없습니다</p>
            <p className="text-xs text-muted-foreground mt-1">곧 새로운 배틀이 시작됩니다!</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {battles.map((battle) => (
                <ScrollReveal key={battle.id}>
                  <BattleCard battle={battle} />
                </ScrollReveal>
              ))}
            </div>

            {completedBattles.length > 0 && (
              <>
                <div className="section-divider" />
                <h2 className="text-sm font-bold text-muted-foreground">🏆 최근 종료된 배틀</h2>
                <div className="space-y-3">
                  {completedBattles.map((battle) => (
                    <ScrollReveal key={battle.id}>
                      <BattleCard battle={battle} isCompleted />
                    </ScrollReveal>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default BattlePage;
