import { useState, useEffect } from "react";
import { Megaphone, Heart, ChevronRight, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

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

const CATEGORY_STYLES: Record<CategoryKey, { bg: string; text: string; border: string; glow: string }> = {
  "공지": {
    bg: "bg-[hsl(170,80%,45%)]/15",
    text: "text-[hsl(170,90%,55%)]",
    border: "border-[hsl(170,80%,45%)]/30",
    glow: "shadow-[0_0_12px_hsl(170,80%,45%,0.4)]",
  },
  "이벤트": {
    bg: "bg-[hsl(330,80%,55%)]/15",
    text: "text-[hsl(330,90%,65%)]",
    border: "border-[hsl(330,80%,55%)]/30",
    glow: "shadow-[0_0_12px_hsl(330,80%,55%,0.4)]",
  },
  "HOT": {
    bg: "bg-[hsl(25,90%,55%)]/15",
    text: "text-[hsl(25,95%,60%)]",
    border: "border-[hsl(25,90%,55%)]/30",
    glow: "shadow-[0_0_12px_hsl(25,90%,55%,0.4)]",
  },
};

const getCategoryStyle = (cat: string) => {
  return CATEGORY_STYLES[cat as CategoryKey] || CATEGORY_STYLES["공지"];
};

const BoardMarquee = () => {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<BoardPost | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const isMobile = useIsMobile();

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
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/community" className="flex items-center gap-2 group">
            <div className="relative">
              <Megaphone className="w-5 h-5 text-neon-purple animate-[shake_2s_ease-in-out_infinite]" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-neon-purple rounded-full animate-ping" />
            </div>
            <h3 className="text-sm font-bold gradient-text neon-text group-hover:opacity-80 transition-opacity">
              Rankit 게시판
            </h3>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>
          <div className="flex items-center gap-2">
            {/* PC write button */}
            {!isMobile && (
              <Link
                to="/community?write=true"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold glass-sm border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10 transition-all"
              >
                <Pencil className="w-3 h-3" />
                글쓰기
              </Link>
            )}
            <Link
              to="/community"
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              전체보기 &gt;
            </Link>
          </div>
        </div>

        {/* Marquee */}
        <div
          className="overflow-hidden relative rounded-2xl"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          <div
            className="flex gap-3 py-2"
            style={{
              animation: "marquee-board 30s linear infinite",
              animationPlayState: isPaused ? "paused" : "running",
            }}
          >
            {marqueeItems.map((post, i) => {
              const style = getCategoryStyle(post.category);
              return (
                <button
                  key={`${post.id}-${i}`}
                  onClick={() => setSelectedPost(post)}
                  className="shrink-0 w-[140px] h-[200px] flex flex-col p-3 rounded-2xl border border-white/10 backdrop-blur-xl bg-white/[0.04] transition-all duration-300 hover:scale-[1.05] hover:border-white/25 text-left cursor-pointer group"
                  style={{
                    boxShadow: "0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(255,255,255,0.03)",
                  }}
                >
                  {/* Category Tag */}
                  <span
                    className={`self-start text-[9px] font-bold px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border} ${style.glow} mb-2`}
                  >
                    [{post.category}]
                  </span>

                  {/* Title - 2 line clamp */}
                  <p className="text-xs font-semibold text-foreground line-clamp-3 leading-[1.5] group-hover:text-neon-cyan transition-colors flex-1">
                    {post.title}
                  </p>

                  {/* Author & Likes */}
                  <div className="flex flex-col gap-1 mt-auto pt-2 border-t border-white/5">
                    <span className="text-[10px] text-muted-foreground truncate">
                      {post.author}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Heart className="w-3 h-3" />
                      {post.likes}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      {isMobile && (
        <Link
          to="/community?write=true"
          className="fixed bottom-20 right-4 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
          style={{
            background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--neon-cyan)))",
            boxShadow: "0 4px 20px hsl(var(--neon-purple) / 0.4)",
          }}
        >
          <Pencil className="w-5 h-5 text-white" />
        </Link>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl border border-white/10 backdrop-blur-xl">
          {selectedPost && (() => {
            const style = getCategoryStyle(selectedPost.category);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border} ${style.glow}`}>
                      [{selectedPost.category}]
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
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BoardMarquee;
