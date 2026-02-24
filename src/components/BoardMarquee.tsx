import { useState } from "react";
import { Megaphone, Heart, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BoardPost {
  id: string;
  category: "공지" | "이벤트" | "HOT";
  title: string;
  author: string;
  likes: number;
  content: string;
}

const SAMPLE_POSTS: BoardPost[] = [
  {
    id: "1",
    category: "공지",
    title: "Rankit 시즌 2 오픈 안내",
    author: "Rankit 운영팀",
    likes: 128,
    content: "안녕하세요, Rankit 운영팀입니다.\n\n시즌 2가 오픈되었습니다! 새로운 크리에이터와 함께 더 뜨거운 경쟁이 시작됩니다.\n\n주요 변경사항:\n- 새로운 카테고리 추가\n- 투표 보상 시스템 개편\n- 주간 미션 업데이트\n\n많은 참여 부탁드립니다!",
  },
  {
    id: "2",
    category: "이벤트",
    title: "🎁 100만 투표 달성 기념 이벤트",
    author: "Rankit 이벤트",
    likes: 256,
    content: "Rankit 누적 투표 100만 달성을 기념하여 특별 이벤트를 진행합니다!\n\n🎉 이벤트 기간: 2주간\n🎁 보상: 추가 투표권 10장 + 특별 배지\n\n참여 방법:\n1. 이벤트 기간 중 매일 투표하기\n2. SNS에 투표 인증 공유하기\n\n많은 참여 부탁드립니다!",
  },
  {
    id: "3",
    category: "HOT",
    title: "이번 주 순위 역전 대란 총정리",
    author: "팬 분석가",
    likes: 342,
    content: "이번 주 정말 역대급 순위 변동이 있었습니다!\n\n📊 주요 변동:\n- 3위 → 1위 역전 달성\n- TOP 10 중 6명 순위 변동\n- 신규 진입 크리에이터 2명\n\n자세한 분석은 본문에서 확인하세요!",
  },
  {
    id: "4",
    category: "공지",
    title: "커뮤니티 가이드라인 업데이트",
    author: "Rankit 운영팀",
    likes: 89,
    content: "커뮤니티 가이드라인이 업데이트되었습니다.\n\n주요 내용:\n- 건전한 응원 문화 권장\n- 악성 댓글 제재 강화\n- 공정한 투표 환경 보장\n\n모두가 즐거운 팬 활동을 위해 협조 부탁드립니다.",
  },
  {
    id: "5",
    category: "이벤트",
    title: "🏆 팬 랭킹 TOP 10 특별 보상",
    author: "Rankit 이벤트",
    likes: 198,
    content: "이번 시즌 팬 랭킹 TOP 10에게 특별 보상이 제공됩니다!\n\n🥇 1위: 크리에이터 영상통화권\n🥈 2-3위: 사인 굿즈\n🥉 4-10위: 한정판 배지\n\n열심히 활동하고 보상을 받아가세요!",
  },
];

const CATEGORY_STYLES: Record<BoardPost["category"], string> = {
  "공지": "bg-[hsl(170,80%,45%)]/20 text-[hsl(170,90%,55%)] border-[hsl(170,80%,45%)]/40 shadow-[0_0_8px_hsl(170,80%,45%,0.3)]",
  "이벤트": "bg-[hsl(330,80%,55%)]/20 text-[hsl(330,90%,65%)] border-[hsl(330,80%,55%)]/40 shadow-[0_0_8px_hsl(330,80%,55%,0.3)]",
  "HOT": "bg-[hsl(25,90%,55%)]/20 text-[hsl(25,95%,60%)] border-[hsl(25,90%,55%)]/40 shadow-[0_0_8px_hsl(25,90%,55%,0.3)]",
};

const BoardMarquee = () => {
  const [selectedPost, setSelectedPost] = useState<BoardPost | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const posts = SAMPLE_POSTS;
  const marqueeItems = [...posts, ...posts];

  return (
    <>
      <div className="container max-w-lg mx-auto px-4">
        <div className="space-y-3">
          {/* Title */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Megaphone className="w-5 h-5 text-neon-purple animate-[shake_2s_ease-in-out_infinite]" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-neon-purple rounded-full animate-ping" />
            </div>
            <h3 className="text-sm font-bold gradient-text neon-text">Rankit 게시판</h3>
          </div>

          {/* Marquee */}
          <div
            className="overflow-hidden relative rounded-xl"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Fade edges */}
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
                  style={{
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${CATEGORY_STYLES[post.category]}`}
                    >
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

      {/* Detail Modal */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
          {selectedPost && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[selectedPost.category]}`}
                  >
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
