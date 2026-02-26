import { useState, useEffect, useRef } from "react";
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

const CARD_HEIGHT = 80;
const GAP = 8;

const BoardMarquee = () => {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<BoardPost | null>(null);
  const isMobile = useIsMobile();
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);

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

  // Vertical auto-scroll (same as FanComments)
  useEffect(() => {
    if (posts.length === 0) return;
    const track = trackRef.current;
    if (!track) return;

    const SPEED = 0.5;
    const totalHeight = posts.length * (CARD_HEIGHT + GAP);

    const animate = () => {
      if (!pausedRef.current && track) {
        posRef.current += SPEED;
        if (posRef.current >= totalHeight) {
          posRef.current = 0;
        }
        track.style.transform = `translateY(-${posRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [posts]);

  if (posts.length === 0) return null;

  const items = [...posts, ...posts];

  return (
    <>
      <div className="space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <Link to="/community" className="flex items-center gap-2 group">
            <div className="w-5 h-5 rounded-md bg-neon-purple/20 flex items-center justify-center relative">
              <Megaphone className="w-3 h-3 text-neon-purple" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-neon-purple rounded-full animate-ping" />
            </div>
            <h3 className="text-sm font-bold gradient-text neon-text group-hover:opacity-80 transition-opacity">
              Rankit 게시판
            </h3>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>
          <div className="flex items-center gap-2">
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

        {/* Vertical scroll container */}
        <div
          className="overflow-hidden"
          style={{ height: `${Math.min(posts.length, 4) * (CARD_HEIGHT + GAP)}px` }}
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { pausedRef.current = false; }}
          onTouchStart={() => { pausedRef.current = true; }}
          onTouchEnd={() => { pausedRef.current = false; }}
        >
          <div
            ref={trackRef}
            className="space-y-2"
            style={{ willChange: "transform" }}
          >
            {items.map((post, idx) => {
              const style = getCategoryStyle(post.category);
              return (
                <button
                  key={`${post.id}-${idx}`}
                  onClick={() => setSelectedPost(post)}
                  className="w-full text-left glass-sm rounded-2xl px-3.5 py-3 transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:border-neon-purple/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                >
                  <div className="flex items-start gap-2.5">
                    {/* Category icon area */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${style.bg} border ${style.border}`}>
                      <Megaphone className={`w-3 h-3 ${style.text}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border} ${style.glow}`}>
                          [{post.category}]
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground line-clamp-1 mt-0.5 leading-relaxed">
                        {post.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{post.author}</span>
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Heart className="w-2.5 h-2.5" />
                          {post.likes}
                        </span>
                      </div>
                    </div>
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
            const catStyle = getCategoryStyle(selectedPost.category);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border} ${catStyle.glow}`}>
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
