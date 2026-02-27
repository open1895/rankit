import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Heart, Plus, BadgeCheck, ImagePlus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface FeedPost {
  id: string;
  content: string;
  image_url: string;
  likes_count: number;
  created_at: string;
}

interface CreatorOfficialFeedProps {
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  creatorUserId?: string | null;
  isVerified: boolean;
}

const FloatingHeart = ({ id, onDone }: { id: number; onDone: (id: number) => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDone(id), 1200);
    return () => clearTimeout(timer);
  }, [id, onDone]);

  const left = 30 + Math.random() * 40;
  return (
    <div
      className="absolute pointer-events-none z-20 animate-float-heart"
      style={{ left: `${left}%`, bottom: "40px" }}
    >
      <Heart className="w-5 h-5 text-red-500 fill-red-500" />
    </div>
  );
};

const CreatorOfficialFeed = ({
  creatorId,
  creatorName,
  creatorAvatar,
  creatorUserId,
  isVerified,
}: CreatorOfficialFeedProps) => {
  const { user } = useAuth();
  const isOwner = !!(user && creatorUserId && user.id === creatorUserId);

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; postId: string }[]>([]);
  let heartCounter = 0;

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("creator_feed_posts")
        .select("*")
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false })
        .limit(20);
      setPosts((data as FeedPost[]) || []);
      setLoading(false);
    };
    fetchPosts();
  }, [creatorId]);

  // Fetch user's likes
  useEffect(() => {
    if (!user) return;
    const fetchLikes = async () => {
      const { data } = await supabase
        .from("creator_feed_likes")
        .select("post_id")
        .eq("user_id", user.id);
      if (data) {
        setLikedPosts(new Set(data.map((l: any) => l.post_id)));
      }
    };
    fetchLikes();
  }, [user]);

  const handlePost = async () => {
    if (content.trim().length < 1) {
      toast.error("내용을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("creator_feed_posts")
      .insert({
        creator_id: creatorId,
        content: content.trim(),
        image_url: imageUrl.trim(),
      })
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      toast.error("게시물 등록에 실패했습니다.");
      return;
    }
    if (data) {
      setPosts((prev) => [data as FeedPost, ...prev]);
      setContent("");
      setImageUrl("");
      setShowCompose(false);
      toast.success("공식 피드가 등록되었습니다! ✨");
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error("좋아요를 누르려면 로그인이 필요합니다.");
      return;
    }

    const alreadyLiked = likedPosts.has(postId);

    if (alreadyLiked) {
      // Unlike
      await supabase
        .from("creator_feed_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      setLikedPosts((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count - 1) } : p))
      );
    } else {
      // Like with floating heart
      const hId = ++heartCounter;
      setFloatingHearts((prev) => [...prev, { id: hId, postId }]);

      await supabase
        .from("creator_feed_likes")
        .insert({ post_id: postId, user_id: user.id });
      setLikedPosts((prev) => new Set([...prev, postId]));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p))
      );
    }
  };

  const handleDelete = async (postId: string) => {
    const { error } = await supabase.from("creator_feed_posts").delete().eq("id", postId);
    if (error) {
      toast.error("삭제에 실패했습니다.");
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success("게시물이 삭제되었습니다.");
  };

  const removeHeart = (id: number) => {
    setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
  };

  const avatarSrc = creatorAvatar?.startsWith("http")
    ? creatorAvatar
    : creatorAvatar?.startsWith("/")
      ? creatorAvatar
      : `/avatars/${creatorAvatar}`;

  return (
    <div className="space-y-3">
      {/* Latest word from creator - shown at top */}
      {posts.length > 0 && (
        <div className="glass-sm p-3 rounded-xl border border-[hsl(var(--neon-purple)/0.2)] bg-gradient-to-r from-[hsl(var(--neon-purple)/0.05)] to-transparent">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-neon-purple uppercase tracking-wider">🎙 크리에이터의 실시간 한마디</span>
          </div>
          <p className="text-xs text-foreground/90 line-clamp-2">{posts[0].content}</p>
        </div>
      )}

      {/* Feed posts */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-xs">로딩 중...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-xs">
          아직 공식 피드가 없어요.
          <br />
          {isOwner ? "첫 번째 게시물을 작성해보세요! ✨" : "크리에이터의 소식을 기다려주세요! 📮"}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="glass-sm rounded-2xl overflow-hidden border border-glass-border relative">
              {/* Header */}
              <div className="flex items-center gap-2.5 p-3 pb-2">
                <img
                  src={avatarSrc}
                  alt={creatorName}
                  className="w-8 h-8 rounded-full object-cover border-2 border-[hsl(var(--neon-purple)/0.3)]"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">{creatorName}</span>
                  {isVerified && (
                    <BadgeCheck className="w-4.5 h-4.5 text-blue-500 fill-blue-500/20" />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {formatDistanceToNow(new Date(post.created_at), { locale: ko, addSuffix: true })}
                </span>
                {isOwner && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Image */}
              {post.image_url && (
                <div className="w-full aspect-square bg-muted overflow-hidden">
                  <img
                    src={post.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Actions & Content */}
              <div className="p-3 pt-2 space-y-1.5 relative">
                {/* Floating hearts */}
                {floatingHearts
                  .filter((h) => h.postId === post.id)
                  .map((h) => (
                    <FloatingHeart key={h.id} id={h.id} onDone={removeHeart} />
                  ))}

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="flex items-center gap-1 group transition-transform active:scale-125"
                  >
                    <Heart
                      className={`w-5 h-5 transition-all ${
                        likedPosts.has(post.id)
                          ? "text-red-500 fill-red-500 scale-110"
                          : "text-muted-foreground group-hover:text-red-400"
                      }`}
                    />
                    <span className="text-xs font-semibold text-muted-foreground">
                      {post.likes_count > 0 ? post.likes_count.toLocaleString() : ""}
                    </span>
                  </button>
                </div>

                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="glass w-full max-w-md rounded-2xl p-4 space-y-3 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">공식 피드 작성</h3>
              <button onClick={() => setShowCompose(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <textarea
              placeholder="팬들에게 전하고 싶은 메시지를 작성하세요..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              className="w-full h-32 p-3 rounded-xl bg-background/50 border border-glass-border text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(var(--neon-purple))]"
            />
            <div className="flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-muted-foreground" />
              <input
                type="url"
                placeholder="이미지 URL (선택사항)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 h-8 px-3 rounded-lg bg-background/50 border border-glass-border text-xs focus:outline-none focus:ring-1 focus:ring-[hsl(var(--neon-purple))]"
              />
            </div>
            <Button
              onClick={handlePost}
              disabled={submitting || content.trim().length < 1}
              className="w-full gradient-primary text-primary-foreground rounded-xl text-sm font-bold"
            >
              {submitting ? "게시 중..." : "게시하기 ✨"}
            </Button>
          </div>
        </div>
      )}

      {/* Floating write button - only for creator owner */}
      {isOwner && (
        <button
          onClick={() => setShowCompose(true)}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[hsl(var(--neon-purple))] to-[hsl(330,80%,55%)] text-primary-foreground shadow-lg shadow-[hsl(var(--neon-purple)/0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default CreatorOfficialFeed;
