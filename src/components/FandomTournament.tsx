import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Crown, Swords } from "lucide-react";

interface Fandom {
  creator_id: string;
  creator_name: string;
  creator_avatar: string;
  member_count: number;
  weekly_score: number;
}

const POINT_VOTE = 3;
const POINT_POST = 5;
const POINT_COMMENT = 1;

const useTopFandoms = (limit = 8) => {
  const [items, setItems] = useState<Fandom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const { data: members } = await (supabase as any)
        .from("fanclub_members")
        .select("creator_id");
      const memberCounts = new Map<string, number>();
      (members || []).forEach((m: any) => {
        memberCounts.set(m.creator_id, (memberCounts.get(m.creator_id) || 0) + 1);
      });
      const ids = Array.from(memberCounts.keys());
      if (ids.length === 0) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }
      const [{ data: creators }, { data: votes }, { data: posts }, { data: comments }] = await Promise.all([
        supabase.from("creators").select("id, name, avatar_url").in("id", ids),
        supabase.from("votes" as any).select("creator_id").in("creator_id", ids).gte("created_at", weekAgo),
        supabase.from("posts").select("creator_id").in("creator_id", ids).gte("created_at", weekAgo),
        supabase.from("comments").select("creator_id").in("creator_id", ids).gte("created_at", weekAgo),
      ]);
      const v = new Map<string, number>(),
        p = new Map<string, number>(),
        c = new Map<string, number>();
      (votes || []).forEach((x: any) => v.set(x.creator_id, (v.get(x.creator_id) || 0) + 1));
      (posts || []).forEach((x: any) => p.set(x.creator_id, (p.get(x.creator_id) || 0) + 1));
      (comments || []).forEach((x: any) => c.set(x.creator_id, (c.get(x.creator_id) || 0) + 1));

      const rows: Fandom[] = (creators || []).map((cr: any) => ({
        creator_id: cr.id,
        creator_name: cr.name,
        creator_avatar: cr.avatar_url,
        member_count: memberCounts.get(cr.id) || 0,
        weekly_score:
          (v.get(cr.id) || 0) * POINT_VOTE +
          (p.get(cr.id) || 0) * POINT_POST +
          (c.get(cr.id) || 0) * POINT_COMMENT,
      }));
      rows.sort((a, b) => b.weekly_score - a.weekly_score || b.member_count - a.member_count);
      if (!cancelled) {
        setItems(rows.slice(0, limit));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { items, loading };
};

const Slot = ({ fandom, winner }: { fandom?: Fandom; winner?: boolean }) => {
  if (!fandom) {
    return (
      <div className="glass-sm rounded-xl p-2 h-14 flex items-center justify-center text-[10px] text-muted-foreground">
        TBD
      </div>
    );
  }
  return (
    <Link
      to={`/creator/${fandom.creator_id}`}
      className={`glass-sm rounded-xl p-2 flex items-center gap-2 transition-all hover:scale-[1.02] ${
        winner ? "border-neon-purple/60 shadow-[0_0_18px_hsl(var(--neon-purple)/0.4)]" : ""
      }`}
    >
      {fandom.creator_avatar ? (
        <img
          src={fandom.creator_avatar}
          alt={fandom.creator_name}
          loading="lazy"
          className="w-7 h-7 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
          {fandom.creator_name.slice(0, 1)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold truncate">{fandom.creator_name}</div>
        <div className="text-[9px] text-neon-purple font-medium">{fandom.weekly_score.toLocaleString()}점</div>
      </div>
      {winner && <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
    </Link>
  );
};

const Match = ({ a, b, winnerId }: { a?: Fandom; b?: Fandom; winnerId?: string }) => (
  <div className="space-y-1.5">
    <Slot fandom={a} winner={winnerId === a?.creator_id} />
    <div className="text-center text-[9px] text-muted-foreground font-bold">VS</div>
    <Slot fandom={b} winner={winnerId === b?.creator_id} />
  </div>
);

const FandomTournament = () => {
  const { items, loading } = useTopFandoms(8);

  if (loading) {
    return <div className="glass rounded-2xl p-6 h-64 animate-pulse" />;
  }

  if (items.length < 2) {
    return (
      <div className="glass rounded-2xl p-6 text-center space-y-2">
        <Swords className="w-7 h-7 text-muted-foreground/60 mx-auto" />
        <p className="text-xs text-muted-foreground">
          아직 토너먼트를 열기엔 활동 중인 팬클럽이 부족해요. 팬클럽에 가입하고 활동해보세요!
        </p>
      </div>
    );
  }

  // Quarterfinal pairings: 1-8, 4-5, 2-7, 3-6 (standard seeding)
  const seeds = items;
  const qf: [Fandom?, Fandom?][] = [
    [seeds[0], seeds[7]],
    [seeds[3], seeds[4]],
    [seeds[1], seeds[6]],
    [seeds[2], seeds[5]],
  ];
  const qfWinners = qf.map(([a, b]) => {
    if (!a) return b;
    if (!b) return a;
    return a.weekly_score >= b.weekly_score ? a : b;
  });
  const sf: [Fandom?, Fandom?][] = [
    [qfWinners[0], qfWinners[1]],
    [qfWinners[2], qfWinners[3]],
  ];
  const sfWinners = sf.map(([a, b]) => {
    if (!a) return b;
    if (!b) return a;
    return a.weekly_score >= b.weekly_score ? a : b;
  });
  const final: [Fandom?, Fandom?] = [sfWinners[0], sfWinners[1]];
  const champion: Fandom | undefined =
    !final[0] ? final[1] : !final[1] ? final[0] : final[0].weekly_score >= final[1].weekly_score ? final[0] : final[1];

  return (
    <div className="glass rounded-2xl p-4 space-y-4 border border-neon-purple/20">
      <div className="flex items-center gap-2">
        <Swords className="w-4 h-4 text-neon-purple" />
        <h3 className="text-sm font-bold gradient-text">🏆 이번 주 최강 팬덤 토너먼트</h3>
      </div>
      <p className="text-[10px] text-muted-foreground">
        주간 활동 점수(투표×3 + 게시글×5 + 응원톡×1)로 8강 → 4강 → 결승 자동 진행
      </p>

      {/* Bracket */}
      <div className="grid grid-cols-3 gap-2 items-center">
        {/* QF column */}
        <div className="space-y-3">
          <div className="text-[9px] font-bold text-center text-muted-foreground">8강</div>
          {qf.map(([a, b], i) => (
            <Match key={i} a={a} b={b} winnerId={qfWinners[i]?.creator_id} />
          ))}
        </div>
        {/* SF column */}
        <div className="space-y-6">
          <div className="text-[9px] font-bold text-center text-muted-foreground">4강</div>
          {sf.map(([a, b], i) => (
            <Match key={i} a={a} b={b} winnerId={sfWinners[i]?.creator_id} />
          ))}
        </div>
        {/* Final column */}
        <div className="space-y-3">
          <div className="text-[9px] font-bold text-center text-muted-foreground">결승</div>
          <Match a={final[0]} b={final[1]} winnerId={champion?.creator_id} />
        </div>
      </div>

      {champion && (
        <Link
          to={`/creator/${champion.creator_id}`}
          className="block glass-sm rounded-xl p-3 border border-yellow-500/40 bg-yellow-500/5 hover:bg-yellow-500/10 transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-muted-foreground">우승 팬덤</div>
              <div className="text-sm font-bold text-foreground truncate">
                👑 {champion.creator_name} 팬클럽
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-bold text-yellow-400">{champion.weekly_score.toLocaleString()}</div>
              <div className="text-[9px] text-muted-foreground">주간점수</div>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
};

export default FandomTournament;
