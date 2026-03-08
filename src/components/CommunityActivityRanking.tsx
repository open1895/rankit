import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Crown, MessageCircle, FileText } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

interface ActivityUser {
  author: string;
  postCount: number;
  commentCount: number;
  score: number;
}

const CommunityActivityRanking = () => {
  const [ranking, setRanking] = useState<ActivityUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [postsRes, commentsRes] = await Promise.all([
        supabase
          .from("board_posts")
          .select("author")
          .eq("is_active", true)
          .gte("created_at", weekAgo),
        supabase
          .from("board_post_comments")
          .select("nickname")
          .gte("created_at", weekAgo),
      ]);

      const scoreMap = new Map<string, { posts: number; comments: number }>();

      (postsRes.data || []).forEach((p: any) => {
        const name = p.author;
        if (name === "익명 크루" || name === "Rankit 운영팀") return;
        const cur = scoreMap.get(name) || { posts: 0, comments: 0 };
        cur.posts++;
        scoreMap.set(name, cur);
      });

      (commentsRes.data || []).forEach((c: any) => {
        const name = c.nickname;
        const cur = scoreMap.get(name) || { posts: 0, comments: 0 };
        cur.comments++;
        scoreMap.set(name, cur);
      });

      const list: ActivityUser[] = Array.from(scoreMap.entries())
        .map(([author, { posts, comments }]) => ({
          author,
          postCount: posts,
          commentCount: comments,
          score: posts * 5 + comments * 1,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      setRanking(list);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold">🏆 이번 주 활동왕</h3>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 rounded-xl bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (ranking.length === 0) return null;

  const medalColors = ["text-amber-400", "text-gray-300", "text-orange-400"];

  return (
    <ScrollReveal>
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold">🏆 이번 주 활동왕</h3>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-400">
            TOP {ranking.length}
          </span>
        </div>
        <div className="space-y-1">
          {ranking.map((user, i) => (
            <div
              key={user.author}
              className={`flex items-center gap-2.5 p-2 rounded-xl transition-all ${
                i === 0 ? "bg-amber-500/10 border border-amber-500/20" : "hover:bg-white/[0.04]"
              }`}
            >
              <span className={`text-xs font-black w-5 text-center ${i < 3 ? medalColors[i] : "text-muted-foreground"}`}>
                {i < 3 ? ["👑", "🥈", "🥉"][i] : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user.author}
                  {getAuthorBadge(user.postCount)}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <FileText className="w-2.5 h-2.5" /> {user.postCount}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <MessageCircle className="w-2.5 h-2.5" /> {user.commentCount}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-primary">{user.score}pt</span>
            </div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
};

// Author badge based on post count
function getAuthorBadge(postCount: number): React.ReactNode {
  if (postCount >= 50) {
    return <span className="ml-1 text-[8px] px-1 py-0 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">🏅 마스터</span>;
  }
  if (postCount >= 20) {
    return <span className="ml-1 text-[8px] px-1 py-0 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 font-semibold">⭐ 베테랑</span>;
  }
  if (postCount >= 10) {
    return <span className="ml-1 text-[8px] px-1 py-0 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold">✨ 활동가</span>;
  }
  return null;
}

export { getAuthorBadge };
export default CommunityActivityRanking;
