import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTickets } from "@/hooks/useTickets";
import { Heart, Search, ArrowLeft, Megaphone, X, Pencil, Send, MessageCircle, User, ImagePlus, ChevronLeft, ChevronRight, Image as ImageIcon, EyeOff, Trash2, Edit3, MoreVertical } from "lucide-react";
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
  image_urls: string[] | null;
  user_id: string | null;
}

interface PostComment {
  id: string;
  post_id: string;
  nickname: string;
  message: string;
  created_at: string;
  parent_id: string | null;
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

const getCategoryStyle = (cat: string) =>
  CATEGORY_STYLES[cat as CategoryKey] || CATEGORY_STYLES["공지"];

const TABS = [
  { label: "전체", value: "all" },
  { label: "🔥 인기", value: "popular" },
  { label: "📢 공지", value: "공지" },
  { label: "🎁 이벤트", value: "이벤트" },
  { label: "🔥 자유", value: "HOT" },
];

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE_MB = 5;
const COMPRESS_MAX_WIDTH = 1200;
const COMPRESS_QUALITY = 0.8;

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

// Compress image in browser before upload
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= COMPRESS_MAX_WIDTH) {
        resolve(file);
        return;
      }
      const ratio = COMPRESS_MAX_WIDTH / width;
      width = COMPRESS_MAX_WIDTH;
      height = Math.round(height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        COMPRESS_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
};

// --- Image Carousel Component ---
const ImageCarousel = ({ images, className = "" }: { images: string[]; className?: string }) => {
  const [current, setCurrent] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  if (!images || images.length === 0) return null;

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <div className="relative aspect-[4/3] w-full">
        {images.map((url, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-all duration-500 ease-out"
            style={{
              opacity: i === current ? 1 : 0,
              transform: i === current ? "scale(1)" : "scale(1.05)",
              pointerEvents: i === current ? "auto" : "none",
            }}
          >
            {/* Skeleton */}
            {!loadedImages.has(i) && (
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-neon-purple/10 via-neon-cyan/10 to-neon-purple/10 animate-[shimmer_2s_ease-in-out_infinite]" />
              </div>
            )}
            <img
              src={url}
              alt={`이미지 ${i + 1}`}
              className="w-full h-full object-cover rounded-xl"
              onLoad={() => setLoadedImages((s) => new Set(s).add(i))}
              loading="lazy"
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + images.length) % images.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % images.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-white w-5" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ---- Main Component ----
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
  const { user } = useAuth();
  const { tickets, refreshTickets } = useTickets();
  const [anonymousMode, setAnonymousMode] = useState(false);
  // Image upload state
  const [selectedImages, setSelectedImages] = useState<{ file: File; preview: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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
  // Edit/Delete state
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", content: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  // Reply state
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);

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
    if (!error && data) setPosts(data as BoardPost[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    const loadLikedPosts = async () => {
      const uid = getUserIdentifier();
      const { data } = await supabase
        .from("board_post_likes")
        .select("post_id")
        .eq("user_identifier", uid);
      if (data) setLikedPosts(new Set(data.map((d: any) => d.post_id)));
    };
    loadLikedPosts();
  }, []);

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

  // --- Image handling ---
  const addImages = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const remaining = MAX_IMAGES - selectedImages.length;
    if (remaining <= 0) {
      toast({ title: "이미지 제한", description: `최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`, variant: "destructive" });
      return;
    }
    const validFiles = fileArr
      .filter((f) => f.type.startsWith("image/"))
      .filter((f) => f.size <= MAX_IMAGE_SIZE_MB * 1024 * 1024)
      .slice(0, remaining);

    if (validFiles.length < fileArr.filter(f => f.type.startsWith("image/")).length) {
      toast({ title: "일부 파일 제외", description: `5MB 초과이거나 이미지가 아닌 파일은 제외되었습니다.` });
    }

    const compressed = await Promise.all(validFiles.map(compressImage));
    const newImages = compressed.map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setSelectedImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addImages(e.dataTransfer.files);
  };

  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return [];
    const urls: string[] = [];
    for (const { file } of selectedImages) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("board-images").upload(path, file, { contentType: file.type });
      if (!error) {
        const { data: urlData } = supabase.storage.from("board-images").getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  };

  // --- Likes ---
  const handleLike = async (postId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const uid = getUserIdentifier();
    const isLiked = likedPosts.has(postId);
    const newLiked = new Set(likedPosts);
    const currentLikes = likeCounts[postId] ?? posts.find((p) => p.id === postId)?.likes ?? 0;

    if (isLiked) {
      newLiked.delete(postId);
      setLikeCounts((prev) => ({ ...prev, [postId]: Math.max(currentLikes - 1, 0) }));
    } else {
      newLiked.add(postId);
      setLikeCounts((prev) => ({ ...prev, [postId]: currentLikes + 1 }));
      setHeartPop(postId);
      setTimeout(() => setHeartPop(null), 600);
    }
    setLikedPosts(newLiked);

    if (isLiked) {
      await supabase.from("board_post_likes").delete().eq("post_id", postId).eq("user_identifier", uid);
    } else {
      await supabase.from("board_post_likes").insert({ post_id: postId, user_identifier: uid });
    }
    if (selectedPost?.id === postId) {
      const newCount = isLiked ? Math.max(currentLikes - 1, 0) : currentLikes + 1;
      setSelectedPost((prev) => (prev ? { ...prev, likes: newCount } : null));
    }
  };

  // --- Comments ---
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
    const insertData: any = {
      post_id: selectedPost.id,
      nickname: commentNickname.trim(),
      message: commentText.trim(),
    };
    if (replyTo) {
      insertData.parent_id = replyTo.id;
    }
    const { error } = await supabase.from("board_post_comments").insert(insertData);
    if (error) {
      toast({ title: "등록 실패", description: "댓글 등록에 실패했습니다.", variant: "destructive" });
    } else {
      toast({ title: "💬 댓글 등록 완료", description: replyTo ? "답글이 등록되었습니다!" : "댓글이 성공적으로 등록되었습니다!" });
      setCommentText("");
      setReplyTo(null);
      const { data } = await supabase
        .from("board_post_comments")
        .select("*")
        .eq("post_id", selectedPost.id)
        .order("created_at", { ascending: true });
      if (data) setComments(data as PostComment[]);
      setSelectedPost((prev) => (prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : null));
      setPosts((prev) => prev.map((p) => (p.id === selectedPost.id ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p)));
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setCommentSubmitting(false);
  };

  // --- Post Submit ---
  const handleSubmit = async () => {
    if (!writeForm.title.trim() || !writeForm.content.trim() || (!anonymousMode && !writeForm.author.trim())) {
      toast({ title: "입력 오류", description: "닉네임, 제목, 내용을 모두 입력해주세요.", variant: "destructive" });
      return;
    }

    // Handle anonymous mode ticket deduction
    if (anonymousMode) {
      if (!user) {
        toast({ title: "로그인 필요", description: "익명 글쓰기는 로그인이 필요합니다.", variant: "destructive" });
        return;
      }
      if (tickets < 2) {
        toast({ title: "티켓 부족", description: "익명 글쓰기에는 티켓 2장이 필요합니다.", variant: "destructive" });
        return;
      }
      const { data: ticketRes } = await supabase.functions.invoke("tickets", {
        body: { action: "anonymous_post" },
      });
      if (!ticketRes?.success) {
        toast({ title: "티켓 부족", description: ticketRes?.error || "티켓이 부족합니다.", variant: "destructive" });
        return;
      }
      await refreshTickets();
      toast({ title: "🎫 티켓 2장 사용", description: "익명 크루로 글이 작성됩니다." });
    }

    setSubmitting(true);

    let imageUrls: string[] = [];
    if (selectedImages.length > 0) {
      imageUrls = await uploadImages();
    }

    const authorName = anonymousMode ? "익명 크루" : writeForm.author.trim();

    const { error } = await supabase.from("board_posts").insert({
      title: writeForm.title.trim(),
      content: writeForm.content.trim(),
      author: authorName,
      category: writeForm.category,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
      user_id: user?.id || null,
    });
    if (error) {
      console.error("Post insert error:", error);
      toast({ title: "등록 실패", description: "게시글 등록에 실패했습니다. 다시 시도해주세요.", variant: "destructive" });
    } else {
      toast({ title: "등록 완료 🎉", description: "게시글이 성공적으로 등록되었습니다!" });
      // Mission nudge for logged-in users
      if (user) {
        setTimeout(() => {
          toast({ title: "🎯 미션 달성!", description: "더보기 → 일일 미션에서 게시글 작성 보상을 받으세요!" });
        }, 1500);
      }
      setWriteOpen(false);
      setWriteForm({ title: "", content: "", author: "", category: "HOT" });
      setAnonymousMode(false);
      selectedImages.forEach((img) => URL.revokeObjectURL(img.preview));
      setSelectedImages([]);
      await fetchPosts();
    }
    setSubmitting(false);
  };

  // --- Edit Post ---
  const handleEditStart = () => {
    if (!selectedPost) return;
    setEditForm({ title: selectedPost.title, content: selectedPost.content });
    setEditMode(true);
    setShowPostMenu(false);
  };

  const handleEditSubmit = async () => {
    if (!selectedPost || !editForm.title.trim() || !editForm.content.trim()) {
      toast({ title: "입력 오류", description: "제목과 내용을 입력해주세요.", variant: "destructive" });
      return;
    }
    setEditSubmitting(true);
    const { error } = await supabase
      .from("board_posts")
      .update({ title: editForm.title.trim(), content: editForm.content.trim() })
      .eq("id", selectedPost.id);
    if (error) {
      console.error("Edit error:", error);
      toast({ title: "수정 실패", description: "게시글 수정에 실패했습니다.", variant: "destructive" });
    } else {
      toast({ title: "✏️ 수정 완료", description: "게시글이 수정되었습니다." });
      setSelectedPost({ ...selectedPost, title: editForm.title.trim(), content: editForm.content.trim() });
      setPosts((prev) => prev.map((p) => p.id === selectedPost.id ? { ...p, title: editForm.title.trim(), content: editForm.content.trim() } : p));
      setEditMode(false);
    }
    setEditSubmitting(false);
  };

  // --- Delete Post ---
  const handleDelete = async () => {
    if (!selectedPost) return;
    const { error } = await supabase
      .from("board_posts")
      .delete()
      .eq("id", selectedPost.id);
    if (error) {
      console.error("Delete error:", error);
      toast({ title: "삭제 실패", description: "게시글 삭제에 실패했습니다.", variant: "destructive" });
    } else {
      toast({ title: "🗑️ 삭제 완료", description: "게시글이 삭제되었습니다." });
      setSelectedPost(null);
      setDeleteConfirm(false);
      setShowPostMenu(false);
      setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id));
    }
  };

  const isPostOwner = (post: BoardPost) => user && post.user_id && user.id === post.user_id;

  const filtered = posts.filter((p) => {
    if (selectedTab !== "all" && p.category !== selectedTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q);
    }
    return true;
  });

  const getLikeCount = (post: BoardPost) => likeCounts[post.id] ?? post.likes;
  const hasImages = (post: BoardPost) => post.image_urls && post.image_urls.length > 0;

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
              const postHasImages = hasImages(post);
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
                        {postHasImages && (
                          <span className="flex items-center gap-0.5 text-[9px] text-neon-cyan/70">
                            <ImageIcon className="w-3 h-3" />
                            {post.image_urls!.length}
                          </span>
                        )}
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
                    {/* Thumbnail for image posts */}
                    {postHasImages && (
                      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                        <img
                          src={post.image_urls![0]}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
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

      {/* ====== Detail Modal ====== */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => { if (!open) { setSelectedPost(null); setComments([]); setEditMode(false); setDeleteConfirm(false); setShowPostMenu(false); } }}>
        <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl border border-white/10 backdrop-blur-xl p-0 flex flex-col" style={{ maxHeight: "85vh" }}>
          {selectedPost && (() => {
            const style = getCategoryStyle(selectedPost.category);
            const liked = likedPosts.has(selectedPost.id);
            const currentLikes = likeCounts[selectedPost.id] ?? selectedPost.likes;
            const postImages = selectedPost.image_urls?.filter(Boolean) || [];
            return (
              <>
                {/* Header */}
                <div className="p-5 pb-0">
                  <DialogHeader>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border} ${style.glow}`}>
                          [{selectedPost.category}]
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatTimeAgo(selectedPost.created_at)}</span>
                      </div>
                      {isPostOwner(selectedPost) && (
                        <div className="relative">
                          <button
                            onClick={() => setShowPostMenu(!showPostMenu)}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {showPostMenu && (
                            <div className="absolute right-0 top-8 z-50 w-28 rounded-xl border border-white/10 backdrop-blur-xl bg-card/95 shadow-xl overflow-hidden animate-fade-in">
                              <button
                                onClick={handleEditStart}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-foreground hover:bg-white/10 transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                수정
                              </button>
                              <button
                                onClick={() => { setDeleteConfirm(true); setShowPostMenu(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                삭제
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <DialogTitle className="text-base font-bold">{selectedPost.title}</DialogTitle>
                    <p className="text-xs text-muted-foreground">{selectedPost.author}</p>
                  </DialogHeader>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-5 min-h-0" style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(270,50%,40%) transparent" }}>
                  {/* Image Carousel */}
                  {postImages.length > 0 && (
                    <div className="pt-3">
                      <ImageCarousel images={postImages} />
                    </div>
                  )}

                  {/* Delete Confirmation */}
                  {deleteConfirm && (
                    <div className="pt-3 pb-3">
                      <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 space-y-3">
                        <p className="text-sm font-semibold text-red-400">정말 이 게시글을 삭제하시겠습니까?</p>
                        <p className="text-xs text-muted-foreground">삭제된 게시글은 복구할 수 없습니다.</p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleDelete}
                            className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-colors"
                          >
                            삭제
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(false)}
                            className="flex-1 py-2 rounded-lg bg-white/5 text-muted-foreground text-xs font-bold hover:bg-white/10 transition-colors"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Post content or Edit form */}
                  {editMode ? (
                    <div className="pt-3 pb-4 space-y-3">
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                        maxLength={100}
                        className="w-full px-3 py-2.5 rounded-xl glass-sm bg-card/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-purple/50"
                        placeholder="제목"
                      />
                      <textarea
                        value={editForm.content}
                        onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                        rows={5}
                        maxLength={2000}
                        className="w-full px-3 py-2.5 rounded-xl glass-sm bg-card/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-purple/50 resize-none"
                        placeholder="내용"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleEditSubmit}
                          disabled={editSubmitting || !editForm.title.trim() || !editForm.content.trim()}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
                          style={{ background: "linear-gradient(135deg, hsl(270,80%,60%), hsl(280,90%,50%))" }}
                        >
                          {editSubmitting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Edit3 className="w-3 h-3" />수정 완료</>}
                        </button>
                        <button
                          onClick={() => setEditMode(false)}
                          className="px-4 py-2 rounded-xl text-xs font-bold glass-sm text-muted-foreground hover:text-foreground transition-all"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 pb-4 text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                      {selectedPost.content}
                    </div>
                  )}

                  {/* Like & Comment bar */}
                  <div className="flex items-center gap-4 py-3 border-t border-b border-white/10">
                    <button onClick={() => handleLike(selectedPost.id)} className="flex items-center gap-1.5 text-sm transition-all active:scale-90">
                      <Heart className={`w-5 h-5 transition-all duration-300 ${liked ? "fill-red-400 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]" : "text-muted-foreground hover:text-red-300"} ${heartPop === selectedPost.id ? "animate-[heart-pop_0.6s_ease-out]" : ""}`} />
                      <span className={`font-semibold ${liked ? "text-red-400" : "text-muted-foreground"}`}>{currentLikes}</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MessageCircle className="w-5 h-5" />
                      <span className="font-semibold">{comments.length}</span>
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="py-3 space-y-3">
                    {commentsLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-12 rounded-xl bg-gradient-to-r from-neon-purple/5 via-neon-cyan/5 to-neon-purple/5 animate-[shimmer_2s_ease-in-out_infinite]" />
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

      {/* ====== Write Modal ====== */}
      <Dialog open={writeOpen} onOpenChange={(open) => { if (!open) { selectedImages.forEach((img) => URL.revokeObjectURL(img.preview)); setSelectedImages([]); } setWriteOpen(open); }}>
        <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl border border-neon-purple/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="w-4 h-4 text-neon-purple" />
              새 글 작성
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            {/* Category Select */}
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

            {/* Anonymous Toggle */}
            {user && (
              <button
                onClick={() => setAnonymousMode(!anonymousMode)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  anonymousMode
                    ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/40"
                    : "glass-sm text-muted-foreground hover:text-foreground"
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>익명으로 작성</span>
                {anonymousMode && <span className="text-[10px] opacity-70">(🎫 2장)</span>}
              </button>
            )}

            {!anonymousMode && (
              <input
                type="text"
                placeholder="닉네임"
                value={writeForm.author}
                onChange={(e) => setWriteForm((f) => ({ ...f, author: e.target.value }))}
                maxLength={20}
                className="w-full px-3 py-2.5 rounded-xl glass-sm bg-card/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-purple/50"
              />
            )}
            {anonymousMode && (
              <div className="w-full px-3 py-2.5 rounded-xl glass-sm bg-neon-purple/10 text-sm text-neon-purple font-medium flex items-center gap-2">
                <EyeOff className="w-4 h-4" />
                익명 크루
              </div>
            )}
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
              rows={4}
              maxLength={2000}
              className="w-full px-3 py-2.5 rounded-xl glass-sm bg-card/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-purple/50 resize-none"
            />

            {/* Image Upload Area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative rounded-xl border-2 border-dashed transition-all duration-200 p-3 ${
                isDragging
                  ? "border-neon-purple bg-neon-purple/10"
                  : "border-white/15 hover:border-white/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files) addImages(e.target.files); e.target.value = ""; }}
              />

              {selectedImages.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 py-4 text-muted-foreground hover:text-neon-purple transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-neon-purple/10 flex items-center justify-center">
                    <ImagePlus className="w-5 h-5 text-neon-purple" />
                  </div>
                  <span className="text-xs">이미지를 선택하거나 여기로 드래그하세요</span>
                  <span className="text-[10px] text-muted-foreground/60">최대 {MAX_IMAGES}장 · {MAX_IMAGE_SIZE_MB}MB 이하</span>
                </button>
              ) : (
                <div className="space-y-2">
                  {/* Preview Grid */}
                  <div className="flex gap-2 flex-wrap">
                    {selectedImages.map((img, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 group">
                        <img src={img.preview} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    {selectedImages.length < MAX_IMAGES && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-16 h-16 rounded-lg border-2 border-dashed border-white/15 flex items-center justify-center text-muted-foreground hover:text-neon-purple hover:border-neon-purple/40 transition-all"
                      >
                        <ImagePlus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{selectedImages.length}/{MAX_IMAGES}장 선택됨</p>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !writeForm.title.trim() || !writeForm.content.trim() || (!anonymousMode && !writeForm.author.trim())}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, hsl(270,80%,60%), hsl(280,90%,50%))" }}
            >
              <Send className="w-4 h-4" />
              {submitting ? (selectedImages.length > 0 ? "이미지 업로드 중..." : "등록 중...") : "게시하기"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Animations */}
      <style>{`
        @keyframes heart-pop {
          0% { transform: scale(1); }
          15% { transform: scale(1.5); }
          30% { transform: scale(0.9); }
          45% { transform: scale(1.2); }
          60% { transform: scale(1); }
          100% { transform: scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-\\[shimmer_2s_ease-in-out_infinite\\] {
          background-size: 200% 100%;
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default CommunityPage;
