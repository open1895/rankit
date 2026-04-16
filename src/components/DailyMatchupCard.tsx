import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Swords, Clock, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MatchupData {
  id: string;
  creator_a_id: string;
  creator_b_id: string;
  votes_a: number;
  votes_b: number;
  date: string;
}

interface CreatorMini {
  id: string;
  name: string;
  avatar_url: string;
  category: string;
}

function getKstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

export default function DailyMatchupCard() {
  const { user } = useAuth();
  const [matchup, setMatchup] = useState<MatchupData | null>(null);
  const [creatorA, setCreatorA] = useState<CreatorMini | null>(null);
  const [creatorB, setCreatorB] = useState<CreatorMini | null>(null);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    const checkVisibility = () => {
      const kst = getKstNow();
      const hour = kst.getUTCHours();
      // Show 09:00 ~ 23:59 KST
      setShow(hour >= 9);
    };
    checkVisibility();
    const id = setInterval(checkVisibility, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    (async () => {
      const kst = getKstNow();
      const today = kst.toISOString().slice(0, 10);
      const { data } = await supabase
        .from("daily_matchups" as any)
        .select("*")
        .eq("date", today)
        .maybeSingle();
      if (cancelled || !data) return;
      const m = data as any as MatchupData;
      setMatchup(m);

      const { data: cs } = await supabase
        .from("creators")
        .select("id, name, avatar_url, category")
        .in("id", [m.creator_a_id, m.creator_b_id]);
      if (cancelled) return;
      const a = (cs || []).find((c: any) => c.id === m.creator_a_id) as any;
      const b = (cs || []).find((c: any) => c.id === m.creator_b_id) as any;
      setCreatorA(a || null);
      setCreatorB(b || null);

      if (user) {
        const { data: voteData } = await supabase
          .from("daily_matchup_votes" as any)
          .select("voted_creator_id")
          .eq("matchup_id", m.id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (voteData) setVotedFor((voteData as any).voted_creator_id);
      }
    })();
    return () => { cancelled = true; };
  }, [show, user]);

  // Realtime updates
  useEffect(() => {
    if (!matchup) return;
    const channel = supabase
      .channel(`matchup-${matchup.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "daily_matchups",
        filter: `id=eq.${matchup.id}`,
      }, (payload) => {
        const updated = payload.new as any;
        setMatchup((prev) => prev ? { ...prev, votes_a: updated.votes_a, votes_b: updated.votes_b } : prev);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchup?.id]);

  // Countdown to midnight KST
  useEffect(() => {
    if (!show) return;
    const tick = () => {
      const kst = getKstNow();
      const tomorrow = new Date(kst);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - kst.getTime();
      if (diff <= 0) { setTimeLeft("00:00:00"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [show]);

  const handleVote = async (creatorId: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    if (!matchup || votedFor || voting) return;
    setVoting(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-matchup-vote", {
        body: { matchup_id: matchup.id, voted_creator_id: creatorId },
      });
      if (error) throw error;
      if ((data as any)?.error === "already_voted") {
        setVotedFor(creatorId);
        toast.info("이미 투표하셨어요.");
      } else {
        setVotedFor(creatorId);
        toast.success("투표 완료! 🎉");
      }
    } catch (e: any) {
      toast.error("투표 실패. 다시 시도해주세요.");
    } finally {
      setVoting(false);
    }
  };

  if (!show || !matchup || !creatorA || !creatorB) return null;

  const total = matchup.votes_a + matchup.votes_b;
  const pctA = total > 0 ? Math.round((matchup.votes_a / total) * 100) : 50;
  const pctB = 100 - pctA;

  return (
    <section className="container max-w-5xl mx-auto px-4">
      <div className="relative overflow-hidden rounded-2xl gradient-primary p-5 text-primary-foreground shadow-2xl">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <Sparkles className="absolute top-2 right-3 w-16 h-16 animate-pulse" />
        </div>

        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5" />
              <h3 className="font-extrabold text-base sm:text-lg">오늘의 라이벌 매치</h3>
            </div>
            <div className="flex items-center gap-1 text-xs font-mono bg-black/20 px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              <span>{timeLeft}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => handleVote(creatorA.id)}
              disabled={!!votedFor || voting}
              className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                votedFor === creatorA.id ? "bg-white/30 ring-2 ring-white" : "bg-white/10 hover:bg-white/20 active:scale-95"
              } ${votedFor && votedFor !== creatorA.id ? "opacity-50" : ""}`}
            >
              <Avatar className="w-14 h-14 ring-2 ring-white/50">
                <AvatarImage src={creatorA.avatar_url} alt={creatorA.name} />
                <AvatarFallback>{creatorA.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-bold truncate max-w-[80px]">{creatorA.name}</span>
              <span className="text-[10px] opacity-90">{matchup.votes_a}표</span>
            </button>

            <div className="text-2xl font-black">VS</div>

            <button
              onClick={() => handleVote(creatorB.id)}
              disabled={!!votedFor || voting}
              className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                votedFor === creatorB.id ? "bg-white/30 ring-2 ring-white" : "bg-white/10 hover:bg-white/20 active:scale-95"
              } ${votedFor && votedFor !== creatorB.id ? "opacity-50" : ""}`}
            >
              <Avatar className="w-14 h-14 ring-2 ring-white/50">
                <AvatarImage src={creatorB.avatar_url} alt={creatorB.name} />
                <AvatarFallback>{creatorB.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-bold truncate max-w-[80px]">{creatorB.name}</span>
              <span className="text-[10px] opacity-90">{matchup.votes_b}표</span>
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-3 w-full rounded-full bg-black/30 overflow-hidden flex">
            <div className="bg-white/90 transition-all duration-500" style={{ width: `${pctA}%` }} />
            <div className="bg-white/40 transition-all duration-500" style={{ width: `${pctB}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span>{pctA}%</span>
            {votedFor ? (
              <span className="opacity-90">투표 완료 ✓</span>
            ) : voting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Link to="/battle" className="underline opacity-90 hover:opacity-100">배틀 페이지 →</Link>
            )}
            <span>{pctB}%</span>
          </div>
        </div>
      </div>
    </section>
  );
}
