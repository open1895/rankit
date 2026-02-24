import { useState, useEffect } from "react";
import { Megaphone, Heart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface BoardPost {
  id: string;
  category: string;
  title: string;
  author: string;
  likes: number;
  content: string;
  is_active: boolean;
  created_at: string;
}

const FALLBACK_POSTS: BoardPost[] = [
  { id: "1", category: "공지", title: "Rankit 시즌 2 오픈 안내", author: "Rankit 운영팀", likes: 128, content: "시즌 2가 오픈되었습니다!", is_active: true, created_at: "" },
  { id: "2", category: "이벤트", title: "🎁 100만 투표 달성 기념 이벤트", author: "Rankit 이벤트", likes: 256, content: "특별 이벤트를 진행합니다!", is_active: true, created_at: "" },
  { id: "3", category: "HOT", title: "이번 주 순위 역전 대란 총정리", author: "팬 분석가", likes: 342, content: "역대급 순위 변동!", is_active: true, created_at: "" },
  { id: "4", category: "공지", title: "커뮤니티 가이드라인 업데이트", author: "Rankit 운영팀", likes: 89, content: "가이드라인이 업데이트되었습니다.", is_active: true, created_at: "" },
  { id: "5", category: "이벤트", title: "🏆 팬 랭킹 TOP 10 특별 보상", author: "Rankit 이벤트", likes: 198, content: "TOP 10에게 특별 보상!", is_active: true, created_at: "" },
];

type CategoryKey = "공지" | "이벤트" | "HOT";

const CATEGORY_STYLES: Record<CategoryKey, string> = {
  "공지": "bg-[hsl(170,80%,45%)]/20 text-[hsl(170,90%,55%)] border-[hsl(170,80%,45%)]/40 shadow-[0_0_8px_hsl(170,80%,45%,0.3)]",
  "이벤트": "bg-[hsl(330,80%,55%)]/20 text-[hsl(330,90%,65%)] border-[hsl(330,80%,55%)]/40 shadow-[0_0_8px_hsl(330,80%,55%,0.3)]",
  "HOT": "bg-[hsl(25,90%,55%)]/20 text-[hsl(25,95%,60%)] border-[hsl(25,90%,55%)]/40 shadow-[0_0_8px_hsl(25,90%,55%,0.3)]",
};

const getCategoryStyle = (cat: string) => {
  return CATEGORY_STYLES[cat as CategoryKey] || CATEGORY_STYLES["공지"];
};

const BoardMarquee = () => {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<BoardPost | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("board_posts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data && data.length > 0) {
        setPosts(data as BoardPost[]);
      } else {
        setPosts(FALLBACK_POSTS);
      }
    };
    fetchPosts();
  }, []);

  if (posts.length === 0) return null;

  const marqueeItems = [...posts, ...posts];

  return (
    <>
      <div className="container max-w-lg mx-auto px-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Megaphone className="w-5 h-5 text-neon-purple animate-[shake_2s_ease-in-out_infinite]" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-neon-purple rounded-full animate-ping" />
            </div>
            <h3 className="text-sm font-bold gradient-text neon-text">Rankit 게시판</h3>
          </div>

          <div
            className="overflow-hidden relative rounded-xl"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

            <div
              className="flex gap-3 py-2"
              style={{
                animation: "marquee-reverse 25s linear infinite",
                animationPlayState: isPaused ? "paused" : "running",
              }}
            >
              {marqueeItems.map((post, i) => (
                <button
                  key={`${post.id}-${i}`}
                  onClick={() => setSelectedPost(post)}
                  className="shrink-0 w-[220px] p-3 rounded-xl border border-white/10 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:border-white/20 text-left cursor-pointer group"
                  style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)" }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${getCategoryStyle(post.category)}`}>
                      {post.category}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Heart className="w-3 h-3" />
                      {post.likes}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-foreground truncate group-hover:text-neon-cyan transition-colors">
                    {post.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">
                    {post.author}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
          {selectedPost && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryStyle(selectedPost.category)}`}>
                    {selectedPost.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Heart className="w-3 h-3" />
                    {selectedPost.likes}
                  </span>
                </div>
                <DialogTitle className="text-base font-bold">{selectedPost.title}</DialogTitle>
                <p className="text-xs text-muted-foreground">{selectedPost.author}</p>
              </DialogHeader>
              <div className="pt-2 text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                {selectedPost.content}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BoardMarquee;
