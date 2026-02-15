import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";
import SEOHead from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ScorePopup from "@/components/ScorePopup";
import DailyActivityBar from "@/components/DailyActivityBar";
import DailyRewardBadge from "@/components/DailyRewardBadge";
import {
  ArrowLeft,
  Crown,
  MessageSquarePlus,
  Heart,
  MessageCircle,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  Flame,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface Post {
  id: string;
  creator_id: string;
  nickname: string;
  title: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

interface PostComment {
  id: string;
  post_id: string;
  nickname: string;
  message: string;
  created_at: string;
}

type SortMode = "latest" | "popular";
const POSTS_PER_PAGE = 10;
const DAILY_MAX_POINTS = 8;
const SCORE_POST = 2;
const SCORE_COMMENT = 0.5;
const SCORE_LIKE = 0.5;
const BEST_THRESHOLD = 5; // likes needed for "베스트" badge

// Simple daily key for localStorage
const getDailyKey = () => `activity_${new Date().toISOString().slice(0, 10)}`;

const CreatorBoard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [creatorName, setCreatorName] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWrite, setShowWrite] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Write form
  const [nickname, setNickname] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Expanded post for comments
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<PostComment[]>([]);
  const [commentNickname, setCommentNickname] = useState("");
  const [commentMessage, setCommentMessage] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [likingPosts, setLikingPosts] = useState<Set<string>>(new Set());

  // Activity score state
  const [dailyPoints, setDailyPoints] = useState(() => {
    const stored = localStorage.getItem(getDailyKey());
    return stored ? parseFloat(stored) : 0;
  });
  const [scorePopup, setScorePopup] = useState({ score: 0, label: "", trigger: 0 });
  const [weeklyPosts, setWeeklyPosts] = useState<Post[]>([]);

  const addPoints = useCallback((points: number, label: string) => {
    setDailyPoints((prev) => {
      const remaining = DAILY_MAX_POINTS - prev;
      if (remaining <= 0) {
        toast.info("오늘의 활동 점수를 모두 채웠어요! 🎉");
        return prev;
      }
      const earned = Math.min(points, remaining);
      const next = prev + earned;
      localStorage.setItem(getDailyKey(), String(next));
      setScorePopup((p) => ({ score: earned, label, trigger: p.trigger + 1 }));
      return next;
    });
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / POSTS_PER_PAGE));

  useEffect(() => {
    if (!id) return;
    supabase.from("creators").select("name").eq("id", id).single().then(res => {
      setCreatorName(res.data?.name || "");
    });

    // Fetch weekly popular posts
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    supabase
      .from("posts")
      .select("*")
      .eq("creator_id", id)
      .gte("created_at", oneWeekAgo.toISOString())
      .gte("likes_count", BEST_THRESHOLD)
      .order("likes_count", { ascending: false })
      .limit(3)
      .then(({ data }) => setWeeklyPosts(data || []));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const from = (page - 1) * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    const orderCol = sortMode === "popular" ? "likes_count" : "created_at";

    const fetchPosts = async () => {
      const countRes = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", id);
      setTotalCount(countRes.count || 0);

      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("creator_id", id)
        .order(orderCol, { ascending: false })
        .range(from, to);

      setPosts(data || []);
      setLoading(false);
    };

    fetchPosts();

    // Realtime
    const channel = supabase
      .channel(`board-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts", filter: `creator_id=eq.${id}` },
        (payload) => {
          setPosts((prev) => [payload.new as Post, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          const updated = payload.new as Post;
          setPosts((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, sortMode, page]);

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (nickname.trim().length < 2) {
      toast.error("닉네임은 2자 이상이어야 합니다.");
      return;
    }
    if (title.trim().length < 2) {
      toast.error("제목은 2자 이상이어야 합니다.");
      return;
    }
    if (content.trim().length < 10) {
      toast.error("내용은 10자 이상이어야 합니다.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("posts").insert({
      creator_id: id,
      nickname: nickname.trim(),
      title: title.trim(),
      content: content.trim(),
    });

    if (error) {
      toast.error("게시글 작성에 실패했습니다.");
      console.error(error);
    } else {
      toast.success("게시글이 등록되었습니다! ✍️");
      addPoints(SCORE_POST, "게시글 작성");
      setTitle("");
      setContent("");
      setShowWrite(false);
    }
    setSubmitting(false);
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error("좋아요를 누르려면 로그인이 필요합니다.");
      navigate("/auth");
      return;
    }
    if (likingPosts.has(postId)) return;
    setLikingPosts((prev) => new Set(prev).add(postId));

    const { data, error } = await supabase.functions.invoke("like-post", {
      body: { post_id: postId },
    });

    if (error || data?.error) {
      toast.error(data?.message || "좋아요에 실패했습니다.");
    } else {
      toast.success("좋아요! ❤️");
      addPoints(SCORE_LIKE, "좋아요");
    }

    setTimeout(() => {
      setLikingPosts((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }, 1000);
  };

  const toggleComments = async (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(postId);

    const { data } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(50);

    setPostComments(data || []);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedPostId) return;

    if (commentNickname.trim().length < 2) {
      toast.error("닉네임은 2자 이상이어야 합니다.");
      return;
    }
    if (commentMessage.trim().length < 2) {
      toast.error("댓글은 2자 이상이어야 합니다.");
      return;
    }

    setCommentSubmitting(true);
    const { error } = await supabase.from("post_comments").insert({
      post_id: expandedPostId,
      nickname: commentNickname.trim(),
      message: commentMessage.trim(),
    });

    if (error) {
      toast.error("댓글 작성에 실패했습니다.");
    } else {
      setCommentMessage("");
      addPoints(SCORE_COMMENT, "댓글 작성");
      // Refresh comments
      const { data } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", expandedPostId)
        .order("created_at", { ascending: true })
        .limit(50);
      setPostComments(data || []);
    }
    setCommentSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead
        title={creatorName ? `${creatorName} 게시판` : "크리에이터 게시판"}
        description={creatorName ? `${creatorName}의 팬 게시판에서 소통하세요!` : "크리에이터 팬 게시판"}
        path={`/creator/${id}/board`}
        noIndex
      />
      <ScorePopup score={scorePopup.score} label={scorePopup.label} trigger={scorePopup.trigger} />
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(`/creator/${id}`)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Crown className="w-5 h-5 text-neon-purple shrink-0" />
            <span className="text-lg font-bold gradient-text truncate">
              {creatorName} 게시판
            </span>
          </div>
          <button
            onClick={() => setShowWrite(!showWrite)}
            className="glass-sm p-2 rounded-lg text-neon-cyan hover:border-neon-cyan/50 transition-all"
          >
            {showWrite ? <X className="w-5 h-5" /> : <MessageSquarePlus className="w-5 h-5" />}
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Daily Activity Bar */}
        <DailyActivityBar currentPoints={dailyPoints} maxPoints={DAILY_MAX_POINTS} />
        <DailyRewardBadge isMaxed={dailyPoints >= DAILY_MAX_POINTS} />

        {/* Sort Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSortMode("latest"); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              sortMode === "latest"
                ? "bg-primary text-primary-foreground"
                : "glass-sm text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            최신순
          </button>
          <button
            onClick={() => { setSortMode("popular"); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              sortMode === "popular"
                ? "bg-primary text-primary-foreground"
                : "glass-sm text-muted-foreground hover:text-foreground"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            인기순
          </button>
          <span className="ml-auto text-[10px] text-muted-foreground">
            총 {totalCount}개
          </span>
        </div>

        {/* Weekly Popular Section */}
        {weeklyPosts.length > 0 && (
          <div className="glass p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-neon-red" />
              <h3 className="text-sm font-bold gradient-text">🏆 주간 인기 게시글</h3>
            </div>
            <div className="space-y-2">
              {weeklyPosts.map((post, idx) => (
                <div key={post.id} className="glass-sm px-3 py-2 flex items-center gap-3">
                  <span className="text-xs font-bold text-neon-purple shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{post.title}</p>
                    <p className="text-[10px] text-muted-foreground">{post.nickname}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-neon-red shrink-0">
                    <Heart className="w-3 h-3 fill-neon-red" />
                    {post.likes_count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Write Form */}
        {showWrite && (
          <form onSubmit={handleSubmitPost} className="glass p-4 space-y-3 animate-slide-up">
            <h3 className="text-sm font-semibold gradient-text">✍️ 새 게시글 작성</h3>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임 (2~20자)"
              maxLength={20}
              className="glass-sm bg-card/30 border-glass-border focus:border-neon-purple/50 text-sm"
            />
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목 (2~100자)"
              maxLength={100}
              className="glass-sm bg-card/30 border-glass-border focus:border-neon-purple/50 text-sm"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요 (10~2000자)"
              maxLength={2000}
              rows={4}
              className="w-full rounded-md glass-sm bg-card/30 border border-glass-border focus:border-neon-purple/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{content.length}/2000</span>
              <Button
                type="submit"
                disabled={submitting}
                size="sm"
                className="gradient-primary text-primary-foreground rounded-lg text-xs px-4"
              >
                {submitting ? "등록 중..." : "게시하기"}
              </Button>
            </div>
          </form>
        )}

        {/* Posts List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">로딩 중...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              아직 게시글이 없어요.
              <br />
              첫 번째 글을 작성해보세요! ✍️
            </p>
            <button
              onClick={() => setShowWrite(true)}
              className="text-xs text-neon-cyan hover:underline"
            >
              글 작성하기 →
            </button>
          </div>
        ) : (
          <>
          {posts.map((post) => (
            <div key={post.id} className="glass p-4 space-y-2">
              {/* Post Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neon-purple">{post.nickname}</span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), {
                    locale: ko,
                    addSuffix: true,
                  })}
                </span>
              </div>

              {/* Post Content */}
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">{post.title}</h4>
                {post.likes_count >= BEST_THRESHOLD && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-neon-red/20 text-neon-red shrink-0">
                    🔥 베스트
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground/80 whitespace-pre-wrap">{post.content}</p>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-1">
                <button
                  onClick={() => handleLike(post.id)}
                  disabled={likingPosts.has(post.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-neon-red transition-colors"
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${likingPosts.has(post.id) ? "fill-neon-red text-neon-red" : ""}`}
                  />
                  <span>{post.likes_count}</span>
                </button>
                <button
                  onClick={() => toggleComments(post.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-neon-cyan transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{post.comments_count}</span>
                  {expandedPostId === post.id ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>

              {/* Comments Section */}
              {expandedPostId === post.id && (
                <div className="space-y-2 pt-2 border-t border-glass-border">
                  {postComments.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-2">
                      아직 댓글이 없어요
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {postComments.map((c) => (
                        <div key={c.id} className="glass-sm px-2.5 py-2 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-neon-cyan">
                              {c.nickname}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {formatDistanceToNow(new Date(c.created_at), {
                                locale: ko,
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="text-[11px] text-foreground/80">{c.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment Input */}
                  <form onSubmit={handleSubmitComment} className="flex gap-2">
                    <Input
                      value={commentNickname}
                      onChange={(e) => setCommentNickname(e.target.value)}
                      placeholder="닉네임"
                      maxLength={20}
                      className="w-20 glass-sm bg-card/30 border-glass-border text-[11px] h-8 px-2"
                    />
                    <Input
                      value={commentMessage}
                      onChange={(e) => setCommentMessage(e.target.value)}
                      placeholder="댓글 입력..."
                      maxLength={500}
                      className="flex-1 glass-sm bg-card/30 border-glass-border text-[11px] h-8 px-2"
                    />
                    <button
                      type="submit"
                      disabled={commentSubmitting}
                      className="glass-sm p-1.5 rounded-md text-neon-cyan hover:border-neon-cyan/50 transition-all shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="glass-sm p-2 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="glass-sm p-2 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          </>
        )}
      </main>
    </div>
  );
};

export default CreatorBoard;
