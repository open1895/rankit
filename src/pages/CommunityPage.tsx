import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Search, ArrowLeft, Megaphone, X, Pencil, Send, MessageCircle, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
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
  comments_count: number;
}

interface PostComment {
  id: string;
  post_id: string;
  nickname: string;
  message: string;
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

// Generate a stable anonymous identifier for likes
const getUserIdentifier = (): string => {
  let id = localStorage.getItem("rankit_anon_id");
  if (!id) {
    id = "anon_" + crypto.randomUUID();
    localStorage.setItem("rankit_anon_id", id);
  }
  return id;
};

const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
};

const CommunityPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<BoardPost | null>(null);
  const [writeOpen, setWriteOpen] = useState(false);
  const [writeForm, setWriteForm] = useState({ title: "", content: "", author: "", category: "HOT" });
  const [submitting, setSubmitting] = useState(false);
  const isMobile = useIsMobile();

  // Detail modal state
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentNickname, setCommentNickname] = useState(() => localStorage.getItem("rankit_nickname") || "");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [heartPop, setHeartPop] = useState<string | null>(null);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Open write modal from URL param
  useEffect(() => {
    if (searchParams.get("write") === "true") {
      setWriteOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("board_posts")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPosts(data as BoardPost[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Load liked status for current user
  useEffect(() => {
    const loadLikedPosts = async () => {
      const uid = getUserIdentifier();
      const { data } = await supabase
        .from("board_post_likes")
        .select("post_id")
        .eq("user_identifier", uid);
      if (data) {
        setLikedPosts(new Set(data.map((d: any) => d.post_id)));
      }
    };
    loadLikedPosts();
  }, []);

  // Load comments when detail modal opens
  useEffect(() => {
    if (!selectedPost) return;
    const loadComments = async () => {
      setCommentsLoading(true);
      const { data } = await supabase
        .from("board_post_comments")
        .select("*")
        .eq("post_id", selectedPost.id)
        .order("created_at", { ascending: true });
      if (data) setComments(data as PostComment[]);
      setCommentsLoading(false);
    };
    loadComments();
  }, [selectedPost?.id]);

  const handleLike = async (postId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const uid = getUserIdentifier();
    const isLiked = likedPosts.has(postId);

    // Optimistic update
    const newLiked = new Set(likedPosts);
    const currentLikes = likeCounts[postId] ?? posts.find(p => p.id === postId)?.likes ?? 0;

    if (isLiked) {
      newLiked.delete(postId);
      setLikeCounts(prev => ({ ...prev, [postId]: Math.max(currentLikes - 1, 0) }));
    } else {
      newLiked.add(postId);
      setLikeCounts(prev => ({ ...prev, [postId]: currentLikes + 1 }));
      // Pop animation
      setHeartPop(postId);
      setTimeout(() => setHeartPop(null), 600);
    }
    setLikedPosts(newLiked);

    // DB operation
    if (isLiked) {
      await supabase
        .from("board_post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_identifier", uid);
    } else {
      await supabase
        .from("board_post_likes")
        .insert({ post_id: postId, user_identifier: uid });
    }

    // Update selectedPost if viewing
    if (selectedPost?.id === postId) {
      const newCount = isLiked ? Math.max(currentLikes - 1, 0) : currentLikes + 1;
      setSelectedPost(prev => prev ? { ...prev, likes: newCount } : null);
    }
  };

  const handleCommentSubmit = async () => {
    if (!selectedPost || !commentText.trim() || !commentNickname.trim()) {
      toast({ title: "입력 오류", description: "닉네임과 댓글을 입력해주세요.", variant: "destructive" });
      return;
    }
    if (commentNickname.trim().length < 2) {
      toast({ title: "닉네임 오류", description: "닉네임은 2자 이상이어야 합니다.", variant: "destructive" });
      return;
    }
    setCommentSubmitting(true);
    localStorage.setItem("rankit_nickname", commentNickname.trim());

    const { error } = await supabase.from("board_post_comments").insert({
      post_id: selectedPost.id,
      nickname: commentNickname.trim(),
      message: commentText.trim(),
    });

    if (error) {
      toast({ title: "등록 실패", description: "댓글 등록에 실패했습니다.", variant: "destructive" });
    } else {
      toast({ title: "💬 댓글 등록 완료", description: "댓글이 성공적으로 등록되었습니다!" });
      setCommentText("");
      // Reload comments
      const { data } = await supabase
        .from("board_post_comments")
        .select("*")
        .eq("post_id", selectedPost.id)
        .order("created_at", { ascending: true });
      if (data) setComments(data as PostComment[]);
      // Update comment count
      setSelectedPost(prev => prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : null);
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setCommentSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!writeForm.title.trim() || !writeForm.content.trim() || !writeForm.author.trim()) {
      toast({ title: "입력 오류", description: "닉네임, 제목, 내용을 모두 입력해주세요.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("board_posts").insert({
      title: writeForm.title.trim(),
      content: writeForm.content.trim(),
      author: writeForm.author.trim(),
      category: writeForm.category,
    });
    if (error) {
      toast({ title: "등록 실패", description: "게시글 등록에 실패했습니다. 다시 시도해주세요.", variant: "destructive" });
    } else {
      toast({ title: "등록 완료 🎉", description: "게시글이 성공적으로 등록되었습니다!" });
      setWriteOpen(false);
      setWriteForm({ title: "", content: "", author: "", category: "HOT" });
      await fetchPosts();
    }
    setSubmitting(false);
  };

  const filtered = posts.filter((p) => {
    if (selectedTab !== "all" && p.category !== selectedTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q);
    }
    return true;
  });

  const getLikeCount = (post: BoardPost) => likeCounts[post.id] ?? post.likes;

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead title="커뮤니티" description="Rankit 게시판 - 공지사항, 이벤트, 자유 게시글을 확인하세요." path="/community" />

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-neon-purple animate-[shake_2s_ease-in-out_infinite]" />
              <h1 className="text-base font-bold gradient-text neon-text">Rankit 게시판</h1>
            </div>
          </div>
          <button
            onClick={() => setWriteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10 transition-all"
          >
            <Pencil className="w-3 h-3" />
            글쓰기
          </button>
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
              const liked = likedPosts.has(post.id);
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
                        <span
                          className={`flex items-center gap-0.5 transition-colors ${liked ? "text-red-400" : ""}`}
                          onClick={(e) => handleLike(post.id, e)}
                        >
                          <Heart className={`w-3 h-3 transition-all ${liked ? "fill-red-400 text-red-400" : ""} ${heartPop === post.id ? "animate-[heart-pop_0.6s_ease-out]" : ""}`} />
                          {getLikeCount(post)}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <MessageCircle className="w-3 h-3" />
                          {post.comments_count || 0}
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

      {/* FAB */}
      {createPortal(
        <button
          onClick={() => setWriteOpen(true)}
          className="flex items-center gap-2 rounded-full transition-transform duration-200 ease-out hover:scale-105 active:scale-95 will-change-transform"
          style={{
            position: "fixed",
            zIndex: 9999,
            bottom: isMobile ? "100px" : "2rem",
            right: "20px",
            background: "linear-gradient(135deg, hsl(270,80%,60%), hsl(280,90%,50%))",
            boxShadow: "0 6px 32px hsl(270,80%,50%,0.6), 0 0 50px hsl(270,80%,60%,0.35), 0 0 80px hsl(280,90%,50%,0.2)",
            padding: isMobile ? "0.75rem 1.25rem" : "0.875rem 1.5rem",
          }}
        >
          <Pencil className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-bold">글쓰기</span>
        </button>,
        document.body
      )}

      {/* Detail Modal with Comments & Likes */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => { if (!open) { setSelectedPost(null); setComments([]); } }}>
        <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl border border-white/10 backdrop-blur-xl p-0 flex flex-col" style={{ maxHeight: "85vh" }}>
          {selectedPost && (() => {
            const style = getCategoryStyle(selectedPost.category);
            const liked = likedPosts.has(selectedPost.id);
            const currentLikes = likeCounts[selectedPost.id] ?? selectedPost.likes;
            return (
              <>
                {/* Header */}
                <div className="p-5 pb-0">
                  <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border} ${style.glow}`}>
                        [{selectedPost.category}]
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatTimeAgo(selectedPost.created_at)}</span>
                    </div>
                    <DialogTitle className="text-base font-bold">{selectedPost.title}</DialogTitle>
                    <p className="text-xs text-muted-foreground">{selectedPost.author}</p>
                  </DialogHeader>
                </div>

                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto px-5 min-h-0" style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(270,50%,40%) transparent" }}>
                  {/* Post content */}
                  <div className="pt-3 pb-4 text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                    {selectedPost.content}
                  </div>

                  {/* Like & Comment count bar */}
                  <div className="flex items-center gap-4 py-3 border-t border-b border-white/10">
                    <button
                      onClick={() => handleLike(selectedPost.id)}
                      className="flex items-center gap-1.5 text-sm transition-all active:scale-90"
                    >
                      <Heart
                        className={`w-5 h-5 transition-all duration-300 ${liked ? "fill-red-400 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]" : "text-muted-foreground hover:text-red-300"} ${heartPop === selectedPost.id ? "animate-[heart-pop_0.6s_ease-out]" : ""}`}
                      />
                      <span className={`font-semibold ${liked ? "text-red-400" : "text-muted-foreground"}`}>
                        {currentLikes}
                      </span>
                    </button>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MessageCircle className="w-5 h-5" />
                      <span className="font-semibold">{comments.length}</span>
                    </div>
                  </div>

                  {/* Comments section */}
                  <div className="py-3 space-y-3">
                    {commentsLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
                        ))}
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-6">
                        아직 댓글이 없어요. 첫 댓글을 남겨보세요! 💬
                      </p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} className="flex gap-2.5 animate-fade-in">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neon-purple/30 to-neon-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <User className="w-3.5 h-3.5 text-neon-purple/70" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">{c.nickname}</span>
                              <span className="text-[10px] text-muted-foreground">{formatTimeAgo(c.created_at)}</span>
                            </div>
                            <p className="text-xs text-foreground/80 mt-0.5 break-words">{c.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={commentsEndRef} />
                  </div>
                </div>

                {/* Fixed comment input */}
                <div className="p-4 border-t border-white/10 bg-card/50 backdrop-blur-sm" style={{ paddingBottom: isMobile ? "calc(1rem + env(safe-area-inset-bottom))" : "1rem" }}>
                  {/* Nickname row */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-purple/40 to-neon-cyan/30 flex items-center justify-center flex-shrink-0">
                      <User className="w-3 h-3 text-neon-purple/80" />
                    </div>
                    <input
                      type="text"
                      value={commentNickname}
                      onChange={(e) => setCommentNickname(e.target.value)}
                      placeholder="닉네임"
                      maxLength={20}
                      className="flex-1 px-2 py-1 rounded-lg bg-white/5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-purple/40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleCommentSubmit()}
                      placeholder="따뜻한 댓글을 남겨주세요 ✨"
                      maxLength={500}
                      className="flex-1 px-3 py-2 rounded-xl bg-white/5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-purple/40"
                    />
                    <button
                      onClick={handleCommentSubmit}
                      disabled={commentSubmitting || !commentText.trim() || !commentNickname.trim()}
                      className="p-2 rounded-xl disabled:opacity-30 transition-all active:scale-90"
                      style={{ background: "linear-gradient(135deg, hsl(270,80%,60%), hsl(280,90%,50%))" }}
                    >
                      {commentSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Write Modal */}
      <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
        <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl border border-neon-purple/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="w-4 h-4 text-neon-purple" />
              새 글 작성
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="flex gap-2">
              {(["HOT", "공지", "이벤트"] as const).map((cat) => {
                const s = getCategoryStyle(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setWriteForm((f) => ({ ...f, category: cat }))}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${s.bg} ${s.text} ${s.border} ${
                      writeForm.category === cat ? `${s.glow} ring-1 ring-offset-1 ring-offset-background` : "opacity-50"
                    }`}
                  >
                    [{cat}]
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              placeholder="닉네임"
              value={writeForm.author}
              onChange={(e) => setWriteForm((f) => ({ ...f, author: e.target.value }))}
              maxLength={20}
              className="w-full px-3 py-2.5 rounded-xl glass-sm bg-card/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-purple/50"
            />
            <input
              type="text"
              placeholder="제목을 입력하세요"
              value={writeForm.title}
              onChange={(e) => setWriteForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={100}
              className="w-full px-3 py-2.5 rounded-xl glass-sm bg-card/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-purple/50"
            />
            <textarea
              placeholder="내용을 입력하세요..."
              value={writeForm.content}
              onChange={(e) => setWriteForm((f) => ({ ...f, content: e.target.value }))}
              rows={5}
              maxLength={2000}
              className="w-full px-3 py-2.5 rounded-xl glass-sm bg-card/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-purple/50 resize-none"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !writeForm.title.trim() || !writeForm.content.trim() || !writeForm.author.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, hsl(270,80%,60%), hsl(280,90%,50%))" }}
            >
              <Send className="w-4 h-4" />
              {submitting ? "등록 중..." : "게시하기"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Heart pop animation */}
      <style>{`
        @keyframes heart-pop {
          0% { transform: scale(1); }
          15% { transform: scale(1.5); }
          30% { transform: scale(0.9); }
          45% { transform: scale(1.2); }
          60% { transform: scale(1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default CommunityPage;
