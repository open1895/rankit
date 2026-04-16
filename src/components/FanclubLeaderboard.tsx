import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Users, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FanclubRow {
  creator_id: string;
  creator_name: string;
  creator_avatar: string;
  category: string;
  member_count: number;
  weekly_score: number;
}

const POINT_VOTE = 3;
const POINT_POST = 5;
const POINT_COMMENT = 1;

const FanclubLeaderboard = () => {
  const [items, setItems] = useState<FanclubRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      // 1. Fanclub creators with member counts
      const { data: members } = await (supabase as any)
        .from("fanclub_members")
        .select("creator_id");

      const memberCounts = new Map<string, number>();
      (members || []).forEach((m: any) => {
        memberCounts.set(m.creator_id, (memberCounts.get(m.creator_id) || 0) + 1);
      });

      const creatorIds = Array.from(memberCounts.keys());
      if (creatorIds.length === 0) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      // 2. Creator info
      const { data: creators } = await supabase
        .from("creators")
        .select("id, name, avatar_url, category")
        .in("id", creatorIds);

      // 3. Weekly votes per creator
      const { data: weeklyVotes } = await supabase
        .from("votes")
        .select("creator_id")
        .in("creator_id", creatorIds)
        .gte("created_at", weekAgo);

      const voteCounts = new Map<string, number>();
      (weeklyVotes || []).forEach((v: any) => {
        voteCounts.set(v.creator_id, (voteCounts.get(v.creator_id) || 0) + 1);
      });

      // 4. Weekly posts per creator
      const { data: weeklyPosts } = await supabase
        .from("posts")
        .select("creator_id")
        .in("creator_id", creatorIds)
        .gte("created_at", weekAgo);

      const postCounts = new Map<string, number>();
      (weeklyPosts || []).forEach((p: any) => {
        postCounts.set(p.creator_id, (postCounts.get(p.creator_id) || 0) + 1);
      });

      // 5. Weekly comments per creator
      const { data: weeklyComments } = await supabase
        .from("comments")
        .select("creator_id")
        .in("creator_id", creatorIds)
        .gte("created_at", weekAgo);

      const commentCounts = new Map<string, number>();
      (weeklyComments || []).forEach((c: any) => {
        commentCounts.set(c.creator_id, (commentCounts.get(c.creator_id) || 0) + 1);
      });

      const rows: FanclubRow[] = (creators || []).map((c) => ({
        creator_id: c.id,
        creator_name: c.name,
        creator_avatar: c.avatar_url,
        category: c.category,
        member_count: memberCounts.get(c.id) || 0,
        weekly_score:
          (voteCounts.get(c.id) || 0) * POINT_VOTE +
          (postCounts.get(c.id) || 0) * POINT_POST +
          (commentCounts.get(c.id) || 0) * POINT_COMMENT,
      }));

      rows.sort(
        (a, b) => b.weekly_score - a.weekly_score || b.member_count - a.member_count,
      );

      if (!cancelled) {
        setItems(rows.slice(0, 50));
        setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass p-3 h-14 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-xs space-y-2">
        <Heart className="w-7 h-7 mx-auto text-muted-foreground/50" />
        <p>아직 활동 중인 팬클럽이 없어요.</p>
        <Link to="/" className="text-secondary underline underline-offset-2 text-xs">
          크리에이터 둘러보고 가입하기 →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground text-center">
        주간 활동 점수 = 투표(×3) + 게시글(×5) + 응원톡(×1)
      </p>
      {items.map((row, i) => {
        const isTop3 = i < 3;
        return (
          <Link
            key={row.creator_id}
            to={`/creator/${row.creator_id}`}
            className={`glass glass-hover p-3 flex items-center gap-3 transition-all rounded-2xl ${
              i === 0
                ? "neon-glow-purple border-neon-purple/50"
                : isTop3
                  ? "border-neon-cyan/30"
                  : ""
            }`}
          >
            <div className="w-7 flex items-center justify-center shrink-0">
              {i === 0 ? (
                <Trophy className="w-5 h-5 text-yellow-400" />
              ) : i === 1 ? (
                <Trophy className="w-5 h-5 text-gray-300" />
              ) : i === 2 ? (
                <Trophy className="w-5 h-5 text-amber-600" />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
              )}
            </div>
            {row.creator_avatar ? (
              <img
                src={row.creator_avatar}
                alt={row.creator_name}
                loading="lazy"
                className="w-10 h-10 rounded-full object-cover border border-glass-border shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0">
                {row.creator_name.slice(0, 1)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">{row.creator_name} 팬클럽</div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-0.5">
                  <Users className="w-2.5 h-2.5" />
                  {row.member_count.toLocaleString()}명
                </span>
                {row.category && (
                  <>
                    <span>·</span>
                    <span>{row.category}</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-bold text-neon-purple">
                {row.weekly_score.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground">주간점수</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default FanclubLeaderboard;
