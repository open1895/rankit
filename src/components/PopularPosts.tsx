import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Heart, MessageCircle, ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

interface PopularPost {
  id: string;
  title: string;
  author: string;
  likes: number;
  comments_count: number;
  category: string;
  created_at: string;
}

const PopularPosts = () => {
  const [posts, setPosts] = useState<PopularPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopular = async () => {
      // Get posts from last 7 days, sorted by engagement (likes + comments)
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("board_posts")
        .select("id, title, author, likes, comments_count, category, created_at")
        .eq("is_active", true)
        .gte("created_at", weekAgo)
        .order("likes", { ascending: false })
        .limit(5);

      if (!error && data) {
        // Sort by engagement score (likes * 2 + comments)
        const sorted = (data as PopularPost[]).sort(
          (a, b) => (b.likes * 2 + b.comments_count) - (a.likes * 2 + a.comments_count)
        );
        setPosts(sorted.slice(0, 5));
      }
      setLoading(false);
    };
    fetchPopular();
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4" style={{ color: "hsl(var(--neon-purple))" }} />
          <h3 className="text-sm font-bold">🔥 인기 게시글</h3>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded-xl bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) return null;

  return (
    <ScrollReveal>
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4" style={{ color: "hsl(var(--neon-purple))" }} />
            <h3 className="text-sm font-bold">🔥 인기 게시글</h3>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
              style={{
                background: "hsl(var(--neon-purple) / 0.15)",
                color: "hsl(var(--neon-purple))",
              }}
            >
              이번 주
            </span>
          </div>
          <Link
            to="/community"
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
          >
            전체보기 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-1.5">
          {posts.map((post, i) => (
            <Link
              key={post.id}
              to="/community"
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-all group"
            >
              <span
                className="text-[11px] font-black w-5 text-center flex-shrink-0"
                style={{
                  color: i < 3 ? "hsl(var(--neon-purple))" : "hsl(var(--muted-foreground))",
                }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {post.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{post.author}</span>
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Heart className="w-2.5 h-2.5" /> {post.likes}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <MessageCircle className="w-2.5 h-2.5" /> {post.comments_count}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
};

export default PopularPosts;
