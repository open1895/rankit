import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Crown, ChevronRight } from "lucide-react";

interface TopFandom {
  creator_id: string;
  creator_name: string;
  creator_avatar: string;
  member_count: number;
  weekly_score: number;
}

const POINT_VOTE = 3;
const POINT_POST = 5;
const POINT_COMMENT = 1;

const TopFandomWidget = () => {
  const [top, setTop] = useState<TopFandom | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: members } = await (supabase as any)
        .from("fanclub_members")
        .select("creator_id");
      const memberCounts = new Map<string, number>();
      (members || []).forEach((m: any) =>
        memberCounts.set(m.creator_id, (memberCounts.get(m.creator_id) || 0) + 1),
      );
      const ids = Array.from(memberCounts.keys());
      if (ids.length === 0) {
        if (!cancelled) setLoading(false);
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
      const rows: TopFandom[] = (creators || []).map((cr: any) => ({
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
        setTop(rows[0] || null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !top || top.weekly_score === 0) return null;

  return (
    <div className="container max-w-5xl mx-auto px-4">
      <Link
        to={`/creator/${top.creator_id}`}
        className="block glass rounded-2xl p-3.5 border border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 via-neon-purple/5 to-transparent hover:from-yellow-500/10 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-yellow-400 to-neon-purple opacity-60 blur-sm" />
            {top.creator_avatar ? (
              <img
                src={top.creator_avatar}
                alt={top.creator_name}
                loading="lazy"
                className="relative w-11 h-11 rounded-full object-cover border-2 border-yellow-400/60"
              />
            ) : (
              <div className="relative w-11 h-11 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground border-2 border-yellow-400/60">
                {top.creator_name.slice(0, 1)}
              </div>
            )}
            <Crown className="absolute -top-1.5 -right-1 w-4 h-4 text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.6)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wide">
                👑 이번 주 최강 팬덤
              </span>
            </div>
            <div className="text-sm font-bold text-foreground truncate">
              {top.creator_name} 팬클럽
            </div>
            <div className="text-[10px] text-muted-foreground">
              주간점수 <span className="text-neon-purple font-bold">{top.weekly_score.toLocaleString()}</span>
              <span className="mx-1">·</span>
              멤버 {top.member_count.toLocaleString()}명
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
      </Link>
    </div>
  );
};

export default TopFandomWidget;
