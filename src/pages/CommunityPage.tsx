import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Search, ArrowLeft, Megaphone, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";

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

const TABS = [
  { label: "전체", value: "all" },
  { label: "📢 공지", value: "공지" },
  { label: "🎁 이벤트", value: "이벤트" },
  { label: "🔥 자유", value: "HOT" },
];

const CommunityPage = () => {
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<BoardPost | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("board_posts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPosts(data as BoardPost[]);
      }
      setLoading(false);
    };
    fetchPosts();
  }, []);

  const filtered = posts.filter((p) => {
    if (selectedTab !== "all" && p.category !== selectedTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead title="커뮤니티" description="Rankit 게시판 - 공지사항, 이벤트, 자유 게시글을 확인하세요." path="/community" />

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-neon-purple animate-[shake_2s_ease-in-out_infinite]" />
            <h1 className="text-base font-bold gradient-text neon-text">Rankit 게시판</h1>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="게시글 검색..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-sm bg-card/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-purple/50 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedTab(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                selectedTab === tab.value
                  ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "glass-sm text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Post List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass p-4 h-20 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 glass rounded-2xl">
            <p className="text-muted-foreground text-sm">게시글이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((post) => {
              const style = getCategoryStyle(post.category);
              return (
                <button
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="w-full text-left p-4 rounded-2xl border border-white/10 backdrop-blur-md bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200 hover:border-white/20 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border} ${style.glow}`}>
                          [{post.category}]
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-neon-cyan transition-colors">
                        {post.title}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{post.author}</span>
                        <span className="flex items-center gap-0.5">
                          <Heart className="w-3 h-3" />
                          {post.likes}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <Footer />

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
    </div>
  );
};

export default CommunityPage;
