import { useState, useEffect, useCallback, useRef, ChangeEvent } from "react";
import Footer from "@/components/Footer";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import SEOHead from "@/components/SEOHead";
import { Creator } from "@/lib/data";
import { Button } from "@/components/ui/button";
import ShareCard from "@/components/ShareCard";
import FanCertCard from "@/components/FanCertCard";
import CelebrationEffect from "@/components/CelebrationEffect";
import FanBadge from "@/components/FanBadge";
import CreatorChat from "@/components/CreatorChat";
import RankitVerifiedBadge from "@/components/RankitVerifiedBadge";
import { generateWeeklyPDF } from "@/lib/pdfReport";
import { useHallOfFameWins, getWinTitle } from "@/hooks/useHallOfFame";
import { copyToClipboard, getPublishedOrigin } from "@/lib/clipboard";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Crown,
  Heart,
  Trophy,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  CheckCircle2,
  BarChart3,
  Share2,
  MessageCircle,
  MessageSquare,
  Medal,
  Star,
  Edit3,
  Save,
  X,
  Camera,
  Code2,
  FileDown,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface CommentItem {
  id: string;
  nickname: string;
  message: string;
  vote_count: number;
  post_count: number;
  created_at: string;
}

type RankHistoryPoint = {
  recorded_at: string;
  rank: number;
  votes_count: number;
};

type FanPeriod = "all" | "weekly" | "monthly";

const CommentForm = ({ creatorId, onCommentAdded }: { creatorId: string; onCommentAdded: (c: CommentItem) => void }) => {
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimNick = nickname.trim();
    const trimMsg = message.trim();
    if (trimNick.length < 2 || trimNick.length > 20) {
      toast.error("닉네임은 2~20자로 입력해주세요.");
      return;
    }
    if (trimMsg.length < 2 || trimMsg.length > 50) {
      toast.error("메시지는 2~50자로 입력해주세요.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ creator_id: creatorId, nickname: trimNick, message: trimMsg })
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      toast.error("메시지 등록에 실패했습니다.");
      return;
    }
    if (data) {
      onCommentAdded(data as CommentItem);
      setMessage("");
      toast.success("응원 메시지가 등록되었습니다! 💬");
    }
  };

  return (
    <div className="glass-sm p-3 rounded-xl space-y-2">
      {!nickname.trim() || nickname.trim().length < 2 ? (
        <Input
          placeholder="닉네임 (2~20자)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={20}
          className="h-8 text-xs bg-background/50 border-glass-border"
        />
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-neon-purple">{nickname.trim()}</span>
          <button
            onClick={() => setNickname("")}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            변경
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="응원 메시지를 남겨보세요! (2~50자)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={50}
          className="h-8 text-xs bg-background/50 border-glass-border flex-1"
          onKeyDown={(e) => e.key === "Enter" && !submitting && handleSubmit()}
        />
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          size="sm"
          className="h-8 px-3 gradient-primary text-primary-foreground rounded-lg text-xs"
        >
          {submitting ? "..." : "등록"}
        </Button>
      </div>
    </div>
  );
};

const CreatorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const hallOfFameWins = useHallOfFameWins();
  const [creator, setCreator] = useState<(Creator & { channel_link?: string; user_id?: string; youtube_channel_id?: string; chzzk_channel_id?: string }) | null>(null);
  const [rankHistory, setRankHistory] = useState<RankHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCreators, setTotalCreators] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [autoShareCard, setAutoShareCard] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState("");
  const [showRankUpHint, setShowRankUpHint] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [activityData, setActivityData] = useState({ posts: 0, postComments: 0, postLikes: 0 });
  const [maxValues, setMaxValues] = useState({ maxSubs: 1, maxVotes: 1, maxActivity: 1 });
  const [fanRanking, setFanRanking] = useState<{ nickname: string; score: number; votes: number; posts: number; comments: number }[]>([]);
  const [fanPeriod, setFanPeriod] = useState<FanPeriod>("all");
  const [fanLoading, setFanLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", category: "", channel_link: "", youtube_channel_id: "", chzzk_channel_id: "", instagram_id: "", tiktok_id: "", youtube_subscribers: "", chzzk_followers: "", instagram_followers: "", tiktok_followers: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [showFanCert, setShowFanCert] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      const [creatorRes, historyRes, countRes, commentsRes] = await Promise.all([
        supabase.from("creators").select("*").eq("id", id).single(),
        supabase
          .from("rank_history")
          .select("*")
          .eq("creator_id", id)
          .order("recorded_at", { ascending: true })
          .limit(50),
        supabase.from("creators").select("id", { count: "exact", head: true }),
        supabase
          .from("comments")
          .select("*")
          .eq("creator_id", id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (creatorRes.error || !creatorRes.data) {
        toast.error("크리에이터를 찾을 수 없습니다.");
        navigate("/");
        return;
      }

      const c = creatorRes.data;
      setCreator({
        id: c.id,
        name: c.name,
        category: c.category,
        avatar_url: c.avatar_url,
        votes_count: c.votes_count,
        subscriber_count: (c as any).subscriber_count ?? 0,
        rank: c.rank,
        previousRank: c.rank,
        is_verified: c.is_verified,
        channel_link: (c as any).channel_link,
        user_id: (c as any).user_id,
        youtube_channel_id: (c as any).youtube_channel_id || "",
        chzzk_channel_id: (c as any).chzzk_channel_id || "",
        youtube_subscribers: (c as any).youtube_subscribers ?? 0,
        chzzk_followers: (c as any).chzzk_followers ?? 0,
        instagram_followers: (c as any).instagram_followers ?? 0,
        tiktok_followers: (c as any).tiktok_followers ?? 0,
        rankit_score: (c as any).rankit_score ?? 0,
      });

      setRankHistory(historyRes.data || []);
      setComments(commentsRes.data || []);
      setTotalCreators(countRes.count || 0);

      // Fetch activity data for influence chart
      const creatorId = c.id;
      const [postsRes, postCommentsRes, postLikesRes, allCreatorsRes] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("creator_id", creatorId),
        supabase.from("post_comments").select("id, post_id").then(async (res) => {
          if (!res.data) return 0;
          const postIds = (await supabase.from("posts").select("id").eq("creator_id", creatorId)).data?.map(p => p.id) || [];
          return res.data.filter(pc => postIds.includes(pc.post_id)).length;
        }),
        supabase.from("posts").select("id, likes_count").eq("creator_id", creatorId),
        supabase.from("creators").select("subscriber_count, votes_count"),
      ]);

      const totalLikes = postLikesRes.data?.reduce((sum, p) => sum + p.likes_count, 0) || 0;
      const postCount = postsRes.count || 0;
      const commentCount = typeof postCommentsRes === "number" ? postCommentsRes : 0;
      setActivityData({ posts: postCount, postComments: commentCount, postLikes: totalLikes });

      // Compute max values for normalization
      if (allCreatorsRes.data) {
        const allData = allCreatorsRes.data;
        setMaxValues({
          maxSubs: Math.max(1, ...allData.map(cr => cr.subscriber_count)),
          maxVotes: Math.max(1, ...allData.map(cr => cr.votes_count)),
          maxActivity: 1, // Will be computed below
        });
      }

      setLoading(false);
    };

    fetchData();

    // Realtime updates
    const channel = supabase
      .channel(`creator-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "creators", filter: `id=eq.${id}` },
        (payload) => {
          const u = payload.new as any;
          setCreator((prev) =>
            prev
              ? { ...prev, previousRank: prev.rank, rank: u.rank, votes_count: u.votes_count }
              : prev
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rank_history", filter: `creator_id=eq.${id}` },
        (payload) => {
          const p = payload.new as RankHistoryPoint;
          setRankHistory((prev) => [...prev.slice(-49), p]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, navigate]);

  // Fan ranking fetcher with period filter
  const fetchFanRanking = useCallback(async (period: FanPeriod) => {
    if (!id) return;
    setFanLoading(true);

    const cutoff = period === "weekly"
      ? new Date(Date.now() - 7 * 86400000).toISOString()
      : period === "monthly"
        ? new Date(Date.now() - 30 * 86400000).toISOString()
        : null;

    const fanMap = new Map<string, { votes: number; posts: number; comments: number }>();

    // From comments (vote messages)
    let commentsQuery = supabase.from("comments").select("nickname, vote_count").eq("creator_id", id);
    if (cutoff) commentsQuery = commentsQuery.gte("created_at", cutoff);
    const { data: commentsData } = await commentsQuery;
    (commentsData || []).forEach((c) => {
      const entry = fanMap.get(c.nickname) || { votes: 0, posts: 0, comments: 0 };
      entry.votes += c.vote_count;
      fanMap.set(c.nickname, entry);
    });

    // From posts
    let postsQuery = supabase.from("posts").select("nickname").eq("creator_id", id);
    if (cutoff) postsQuery = postsQuery.gte("created_at", cutoff);
    const { data: postsData } = await postsQuery;
    (postsData || []).forEach((p) => {
      const entry = fanMap.get(p.nickname) || { votes: 0, posts: 0, comments: 0 };
      entry.posts += 1;
      fanMap.set(p.nickname, entry);
    });

    // From post_comments
    const { data: allPosts } = await supabase.from("posts").select("id").eq("creator_id", id);
    const postIds = (allPosts || []).map(p => p.id);
    if (postIds.length > 0) {
      let pcQuery = supabase.from("post_comments").select("nickname, post_id");
      if (cutoff) pcQuery = pcQuery.gte("created_at", cutoff);
      const { data: pcData } = await pcQuery;
      (pcData || []).filter(pc => postIds.includes(pc.post_id)).forEach((pc) => {
        const entry = fanMap.get(pc.nickname) || { votes: 0, posts: 0, comments: 0 };
        entry.comments += 1;
        fanMap.set(pc.nickname, entry);
      });
    }

    const ranking = Array.from(fanMap.entries())
      .map(([nickname, data]) => ({
        nickname,
        score: data.votes * 3 + data.posts * 2 + data.comments,
        ...data,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setFanRanking(ranking);
    setFanLoading(false);
  }, [id]);

  useEffect(() => {
    fetchFanRanking(fanPeriod);
  }, [fanPeriod, fetchFanRanking]);

  const [hasVotedToday, setHasVotedToday] = useState(false);

  // Check if logged-in user already voted for this creator today
  useEffect(() => {
    if (!id || !user) return;
    const checkVote = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("votes")
        .select("id")
        .eq("creator_id", id)
        .eq("user_id", user.id)
        .gte("created_at", todayStart.toISOString())
        .limit(1);
      setHasVotedToday(!!(data && data.length > 0));
    };
    checkVote();
  }, [user, id]);

  const handleVote = async () => {
    if (!id) return;

    if (!user) {
      toast.error("투표하려면 로그인이 필요합니다.");
      navigate("/auth");
      return;
    }

    if (hasVotedToday) {
      toast.error("오늘 이미 투표하셨습니다! 내일 다시 투표할 수 있어요.");
      return;
    }

    // Show rank-up hint before vote
    setShowRankUpHint(true);
    setTimeout(() => setShowRankUpHint(false), 3000);

    const { data, error } = await supabase.functions.invoke("vote", {
      body: { creator_id: id },
    });

    if (error || data?.error) {
      setShowRankUpHint(false);
      if (data?.error === "already_voted") {
        toast.error("오늘 이미 이 크리에이터에게 투표하셨습니다. 내일 다시 투표할 수 있어요.");
        setHasVotedToday(true);
      } else {
        toast.error(data?.message || error?.message || "투표에 실패했습니다.");
      }
      return;
    }

    setHasVotedToday(true);
    setShowRankUpHint(false);
    setCelebrationMsg("투표 완료! 🎉");
    setShowCelebration(true);
    toast.success("투표 완료! 🎉 공유 카드를 생성합니다...");
    setAutoShareCard(true);
    setShowShare(true);
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("JPG, PNG, WEBP, GIF 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("이미지는 2MB 이하만 가능합니다.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveEdit = async () => {
    if (!creator || !user || creator.user_id !== user.id) return;
    const { name, category, channel_link } = editForm;
    if (name.trim().length < 2 || name.length > 50) {
      toast.error("이름은 2~50자로 입력해주세요.");
      return;
    }
    if (category.trim().length < 1 || category.length > 20) {
      toast.error("카테고리는 1~20자로 입력해주세요.");
      return;
    }
    if (channel_link.trim().length < 5 || channel_link.length > 300) {
      toast.error("채널 링크는 5~300자로 입력해주세요.");
      return;
    }
    setEditSaving(true);

    let newAvatarUrl = creator.avatar_url;

    // Upload avatar if changed
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });
      if (uploadError) {
        toast.error("아바타 업로드에 실패했습니다.");
        setEditSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    }

    const { error } = await supabase
      .from("creators")
      .update({
        name: name.trim(),
        category: category.trim(),
        channel_link: channel_link.trim(),
        avatar_url: newAvatarUrl,
        youtube_channel_id: editForm.youtube_channel_id.trim(),
        chzzk_channel_id: editForm.chzzk_channel_id.trim(),
        youtube_subscribers: parseInt(editForm.youtube_subscribers) || 0,
        chzzk_followers: parseInt(editForm.chzzk_followers) || 0,
        instagram_followers: parseInt(editForm.instagram_followers) || 0,
        tiktok_followers: parseInt(editForm.tiktok_followers) || 0,
      })
      .eq("id", creator.id);
    setEditSaving(false);
    if (error) {
      toast.error("수정에 실패했습니다.");
      return;
    }
    setCreator(prev => prev ? {
      ...prev,
      name: name.trim(),
      category: category.trim(),
      channel_link: channel_link.trim(),
      avatar_url: newAvatarUrl,
    } : prev);
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    toast.success("프로필이 수정되었습니다! ✅");
  };


  const handleDownloadPDF = async () => {
    if (!creator || !id) return;
    setPdfGenerating(true);
    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      const weekLabel = `${weekStart.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} ~ ${now.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}`;

      const cd = rankHistory.map((h) => ({
        time: new Date(h.recorded_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
        rank: h.rank,
        votes: h.votes_count,
      }));

      generateWeeklyPDF({
        name: creator.name,
        category: creator.category,
        rank: creator.rank,
        votes_count: creator.votes_count,
        rankit_score: creator.rankit_score,
        youtube_subscribers: creator.youtube_subscribers,
        chzzk_followers: creator.chzzk_followers,
        instagram_followers: creator.instagram_followers,
        tiktok_followers: creator.tiktok_followers,
        is_verified: creator.is_verified,
        rankHistory: cd,
        fanRanking,
        weekLabel,
      });
      toast.success("PDF 리포트가 다운로드되었습니다! 📄");
    } catch (e) {
      toast.error("PDF 생성에 실패했습니다.");
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleCopyEmbed = async () => {
    if (!id) return;
    const origin = getPublishedOrigin();
    const embedCode = `<iframe src="${origin}/widget/creator/${id}" width="300" height="120" frameborder="0" style="border-radius:16px; overflow:hidden;"></iframe>`;
    const ok = await copyToClipboard(embedCode);
    if (ok) {
      setEmbedCopied(true);
      toast.success("임베드 코드가 복사되었습니다! 🎉");
      setTimeout(() => setEmbedCopied(false), 2500);
    }
  };


  if (loading || !creator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">로딩 중...</div>
      </div>
    );
  }

  const chartData = rankHistory.map((h) => ({
    time: new Date(h.recorded_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
    rank: h.rank,
    votes: h.votes_count,
  }));

  // Add current state as last point if no history
  if (chartData.length === 0) {
    chartData.push({
      time: "현재",
      rank: creator.rank,
      votes: creator.votes_count,
    });
  }

  const topPercent = totalCreators > 0 ? Math.round((creator.rank / totalCreators) * 100) : 0;

  // Compute influence score components (normalized 0-100 scale for display)
  const activityScore = activityData.postComments + activityData.posts * 2 + activityData.postLikes;
  const subsNorm = maxValues.maxSubs > 0 ? (creator.subscriber_count / maxValues.maxSubs) * 100 : 0;
  const votesNorm = maxValues.maxVotes > 0 ? (creator.votes_count / maxValues.maxVotes) * 100 : 0;
  // For activity, use raw score as percentage (capped at 100)
  const activityNorm = Math.min(100, activityScore * 5);

  const influenceTotal = subsNorm * 0.4 + votesNorm * 0.4 + activityNorm * 0.2;
  const subsContrib = influenceTotal > 0 ? (subsNorm * 0.4 / influenceTotal) * 100 : 33;
  const votesContrib = influenceTotal > 0 ? (votesNorm * 0.4 / influenceTotal) * 100 : 33;
  const activityContrib = influenceTotal > 0 ? (activityNorm * 0.2 / influenceTotal) * 100 : 34;

  const pieData = [
    { name: "구독자", value: Math.round(subsContrib), color: "hsl(270 91% 65%)" },
    { name: "투표", value: Math.round(votesContrib), color: "hsl(187 94% 42%)" },
    { name: "커뮤니티", value: Math.round(activityContrib), color: "hsl(142 71% 45%)" },
  ];

  return (
    <div className="min-h-screen bg-background mesh-bg">
      <SEOHead
        title={`${creator.name} - 크리에이터 프로필`}
        description={`${creator.name}의 랭킹, 투표 현황, 팬 활동을 확인하세요. 현재 ${creator.rank}위, ${creator.votes_count}표 획득!`}
        path={`/creator/${creator.id}`}
        ogImage={creator.avatar_url || undefined}
      />
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Crown className="w-5 h-5 text-neon-purple" />
            <span className="text-lg font-bold gradient-text">프로필</span>
          </div>
          
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="glass p-6 text-center space-y-4 animate-fade-in-up">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              {isEditing ? (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative group"
                >
                  {(avatarPreview || creator.avatar_url) ? (
                    <img
                      src={avatarPreview || creator.avatar_url}
                      alt={creator.name}
                      className="w-20 h-20 rounded-full object-cover ring-3 ring-neon-cyan/50 ring-offset-2 ring-offset-background"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground">
                      {creator.name.slice(0, 2)}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </button>
              ) : (
                <>
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.name}
                      className="w-20 h-20 rounded-full object-cover ring-3 ring-neon-purple/30 ring-offset-2 ring-offset-background"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground shadow-xl shadow-primary/30">
                      {creator.rank <= 3 ? <Trophy className="w-8 h-8" /> : creator.name.slice(0, 2)}
                    </div>
                  )}
                </>
              )}
              {creator.is_verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-neon-cyan flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-background" />
                </div>
              )}
            </div>
          </div>

          <div>
            {isEditing ? (
              <div className="space-y-3 text-left">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">이름</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="glass-sm border-glass-border"
                    maxLength={50}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">카테고리</label>
                  <Input
                    value={editForm.category}
                    onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))}
                    className="glass-sm border-glass-border"
                    maxLength={20}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">채널 링크</label>
                  <Input
                    value={editForm.channel_link}
                    onChange={(e) => setEditForm(f => ({ ...f, channel_link: e.target.value }))}
                    className="glass-sm border-glass-border"
                    maxLength={300}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">YouTube 채널 ID</label>
                  <Input
                    value={editForm.youtube_channel_id}
                    onChange={(e) => setEditForm(f => ({ ...f, youtube_channel_id: e.target.value }))}
                    className="glass-sm border-glass-border"
                    maxLength={100}
                    placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">치지직 채널 ID</label>
                  <Input
                    value={editForm.chzzk_channel_id}
                    onChange={(e) => setEditForm(f => ({ ...f, chzzk_channel_id: e.target.value }))}
                    className="glass-sm border-glass-border"
                    maxLength={100}
                    placeholder="abcdef1234567890"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">YouTube 구독자</label>
                    <Input
                      type="number"
                      value={editForm.youtube_subscribers}
                      onChange={(e) => setEditForm(f => ({ ...f, youtube_subscribers: e.target.value }))}
                      className="glass-sm border-glass-border"
                      placeholder="0"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">치지직 팔로워</label>
                    <Input
                      type="number"
                      value={editForm.chzzk_followers}
                      onChange={(e) => setEditForm(f => ({ ...f, chzzk_followers: e.target.value }))}
                      className="glass-sm border-glass-border"
                      placeholder="0"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">인스타그램 팔로워</label>
                    <Input
                      type="number"
                      value={editForm.instagram_followers}
                      onChange={(e) => setEditForm(f => ({ ...f, instagram_followers: e.target.value }))}
                      className="glass-sm border-glass-border"
                      placeholder="0"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">틱톡 팔로워</label>
                    <Input
                      type="number"
                      value={editForm.tiktok_followers}
                      onChange={(e) => setEditForm(f => ({ ...f, tiktok_followers: e.target.value }))}
                      className="glass-sm border-glass-border"
                      placeholder="0"
                      min={0}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                    className="flex-1 gradient-primary text-primary-foreground rounded-xl"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {editSaving ? "저장 중..." : "저장"}
                  </Button>
                  <Button
                    onClick={() => { setIsEditing(false); setAvatarFile(null); setAvatarPreview(null); }}
                    variant="outline"
                    className="rounded-xl glass-sm border-glass-border"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold leading-snug break-words text-center">
                  {creator.name}
                  {creator.is_verified && (
                    <span className="inline-block align-middle ml-1.5 -translate-y-px">
                      <CheckCircle2 className="w-5 h-5 text-neon-cyan inline" />
                    </span>
                  )}
                  {(() => {
                    const wins = hallOfFameWins[creator.id] || 0;
                    const title = getWinTitle(wins);
                    if (!title) return null;
                    return (
                      <span className="inline-flex items-center gap-1 ml-2 align-middle">
                        <Crown className="w-5 h-5 text-yellow-400 inline" />
                        <span className="text-xs font-bold text-yellow-400">{title}</span>
                      </span>
                    );
                  })()}
                </h2>
                {creator.category && (
                  <p className="text-sm text-muted-foreground mt-1">{creator.category}</p>
                )}

                {/* SNS Links */}
                {!isEditing && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    {creator.youtube_channel_id && (
                      <a
                        href={`https://youtube.com/channel/${creator.youtube_channel_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[hsl(0_100%_50%/0.1)] hover:bg-[hsl(0_100%_50%/0.2)] transition-colors"
                        title="YouTube"
                      >
                        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-[hsl(0_100%_50%)]" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </a>
                    )}
                    {creator.chzzk_channel_id && (
                      <a
                        href={`https://chzzk.naver.com/${creator.chzzk_channel_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[hsl(142_71%_45%/0.1)] hover:bg-[hsl(142_71%_45%/0.2)] transition-colors"
                        title="치지직"
                      >
                        <span className="text-sm font-black text-[hsl(142_71%_45%)]">치</span>
                      </a>
                    )}
                    {creator.instagram_followers > 0 && creator.channel_link?.includes("instagram") && (
                      <a
                        href={creator.channel_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[hsl(330_80%_55%/0.1)] hover:bg-[hsl(330_80%_55%/0.2)] transition-colors"
                        title="Instagram"
                      >
                        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-[hsl(330_80%_55%)]" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                        </svg>
                      </a>
                    )}
                    {creator.tiktok_followers > 0 && creator.channel_link?.includes("tiktok") && (
                      <a
                        href={creator.channel_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[hsl(0_0%_100%/0.1)] hover:bg-[hsl(0_0%_100%/0.2)] transition-colors"
                        title="TikTok"
                      >
                        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-foreground" fill="currentColor">
                          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                        </svg>
                      </a>
                    )}
                    {creator.channel_link && !creator.channel_link.includes("instagram") && !creator.channel_link.includes("tiktok") && (
                      <a
                        href={creator.channel_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[hsl(var(--neon-cyan)/0.1)] hover:bg-[hsl(var(--neon-cyan)/0.2)] transition-colors"
                        title="채널 방문"
                      >
                        <ExternalLink className="w-4 h-4 text-[hsl(var(--neon-cyan))]" />
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Owner Edit Button */}
          {!isEditing && user && creator.user_id === user.id && (
            <Button
              onClick={() => {
                setEditForm({
                  name: creator.name,
                  category: creator.category,
                  channel_link: creator.channel_link || "",
                  youtube_channel_id: (creator as any).youtube_channel_id || "",
                  chzzk_channel_id: (creator as any).chzzk_channel_id || "",
                  instagram_id: "",
                  tiktok_id: "",
                  youtube_subscribers: String((creator as any).youtube_subscribers || 0),
                  chzzk_followers: String((creator as any).chzzk_followers || 0),
                  instagram_followers: String((creator as any).instagram_followers || 0),
                  tiktok_followers: String((creator as any).tiktok_followers || 0),
                });
                setAvatarFile(null);
                setAvatarPreview(null);
                setIsEditing(true);
              }}
              variant="outline"
              className="w-full glass-sm border-neon-cyan/30 hover:border-neon-cyan/60 text-neon-cyan text-sm rounded-xl"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              프로필 수정
            </Button>
          )}

          {/* Rank-up hint */}
          {showRankUpHint && (
            <div className="glass-sm p-3 rounded-xl border border-[hsl(var(--neon-cyan)/0.3)] animate-fade-in text-center space-y-1">
              <div className="text-sm font-bold text-[hsl(var(--neon-cyan))]">📊 순위 상승 가능성 분석</div>
              <div className="flex items-center justify-center gap-3">
                <div className="text-xs text-muted-foreground">현재 <span className="font-bold text-foreground">#{creator.rank}</span></div>
                <TrendingUp className="w-4 h-4 text-[hsl(var(--neon-cyan))] animate-bounce" />
                <div className="text-xs text-[hsl(var(--neon-cyan))] font-bold">순위 상승 중...</div>
              </div>
              <div className="w-full h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[hsl(var(--neon-purple))] to-[hsl(var(--neon-cyan))] rounded-full animate-[pulse_1s_ease-in-out_infinite]" style={{ width: "70%" }} />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleVote}
              disabled={hasVotedToday}
              className="flex-1 h-12 text-base font-bold gradient-primary text-primary-foreground rounded-xl neon-glow-purple hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Heart className="w-5 h-5 mr-2" />
              {hasVotedToday ? "오늘 투표 완료 ✓" : "투표하기"}
            </Button>
            <Button
              onClick={() => setShowShare(true)}
              variant="outline"
              className="h-12 px-4 rounded-xl glass-sm border-glass-border hover:border-neon-cyan/50"
            >
              <Share2 className="w-5 h-5 text-neon-cyan" />
            </Button>
          </div>
          {/* Anonymous vote hint */}
          {!user && (
            <p className="text-xs text-center text-muted-foreground">
              <button
                onClick={() => navigate("/auth")}
                className="text-neon-cyan underline underline-offset-2"
              >
                로그인하고 투표에 참여하세요
              </button>
            </p>
          )}

          {/* Fan Cert Card Button */}
          <button
            onClick={() => setShowFanCert(true)}
            className="w-full glass-sm p-3 text-center text-sm font-medium transition-all rounded-xl border border-[hsl(var(--neon-purple)/0.3)] hover:border-[hsl(var(--neon-purple)/0.6)] hover:shadow-[0_0_15px_hsl(var(--neon-purple)/0.1)]"
          >
            <span className="inline-flex items-center gap-2 bg-gradient-to-r from-[hsl(var(--neon-purple))] to-[hsl(var(--neon-cyan))] bg-clip-text text-transparent font-bold">
              📸 팬 인증 카드 만들기
            </span>
          </button>

          {/* Board Link */}
          <Link
            to={`/creator/${id}/board`}
            className="block w-full glass-sm p-3 text-center text-sm font-medium text-neon-cyan hover:border-neon-cyan/50 transition-all rounded-xl"
          >
            <span className="inline-flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              팬 게시판 바로가기
            </span>
          </Link>

          {/* Real-time Chat */}
          <CreatorChat creatorId={id!} creatorName={creator.name} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3" style={{ animationDelay: '100ms' }}>
          <div className="glass-sm glass-hover p-4 text-center space-y-1">
            <div className="text-2xl font-bold gradient-text neon-text-purple">{creator.rank}</div>
            <div className="text-[11px] text-muted-foreground">현재 순위</div>
          </div>
          <div className="glass-sm glass-hover p-4 text-center space-y-1">
            <div className="text-2xl font-bold text-neon-cyan neon-text-cyan">
              {topPercent <= 0 ? "—" : `${topPercent}%`}
            </div>
            <div className="text-[11px] text-muted-foreground">상위 퍼센트</div>
          </div>
        </div>

        {/* Influence Score Breakdown */}
        <div className="glass p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-neon-purple" />
            <h3 className="text-sm font-semibold">📊 영향력 지수 구성</h3>
          </div>

          <div className="flex items-center gap-4">
            {/* Donut Chart */}
            <div className="relative w-32 h-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-bold gradient-text">{Math.round(influenceTotal)}</div>
                  <div className="text-[8px] text-muted-foreground">점수</div>
                </div>
              </div>
            </div>

            {/* Legend + Stats */}
            <div className="flex-1 space-y-2.5">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] text-muted-foreground flex-1">{item.name}</span>
                  <span className="text-xs font-bold" style={{ color: item.color }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detail Stats */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="glass-sm p-2.5 text-center space-y-0.5">
              <div className="text-sm font-bold text-neon-purple">{creator.subscriber_count.toLocaleString()}</div>
              <div className="text-[9px] text-muted-foreground">구독자</div>
            </div>
            <div className="glass-sm p-2.5 text-center space-y-0.5">
              <div className="text-sm font-bold text-neon-cyan">{creator.votes_count.toLocaleString()}</div>
              <div className="text-[9px] text-muted-foreground">투표</div>
            </div>
            <div className="glass-sm p-2.5 text-center space-y-0.5">
              <div className="text-sm font-bold text-neon-cyan">{activityScore}</div>
              <div className="text-[9px] text-muted-foreground">활동점수</div>
            </div>
          </div>
        </div>

        {/* Rank Chart */}
        <div className="glass p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-neon-purple" />
            <h3 className="text-sm font-semibold">순위 변동</h3>
          </div>
          {chartData.length <= 1 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              아직 순위 변동 기록이 없어요.
              <br />
              투표가 진행되면 그래프가 나타납니다!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 15% 20%)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  reversed
                  domain={[1, "auto"]}
                  tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(230 20% 12%)",
                    border: "1px solid hsl(230 15% 25%)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "hsl(210 40% 95%)" }}
                  formatter={(value: number) => [`${value}위`, "순위"]}
                />
                <Line
                  type="monotone"
                  dataKey="rank"
                  stroke="hsl(270 91% 65%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(270 91% 65%)", r: 3 }}
                  activeDot={{ r: 5, fill: "hsl(187 94% 42%)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Votes Chart */}
        <div className="glass p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-neon-cyan" />
            <h3 className="text-sm font-semibold">투표 추이</h3>
          </div>
          {chartData.length <= 1 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              투표 데이터가 쌓이면 그래프가 나타납니다!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="voteGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(187 94% 42%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(187 94% 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 15% 20%)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(230 20% 12%)",
                    border: "1px solid hsl(230 15% 25%)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "hsl(210 40% 95%)" }}
                  formatter={(value: number) => [`${value.toLocaleString()}표`, "투표수"]}
                />
                <Area
                  type="monotone"
                  dataKey="votes"
                  stroke="hsl(187 94% 42%)"
                  strokeWidth={2}
                  fill="url(#voteGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Fan Ranking Leaderboard */}
        <div className="glass p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4 text-neon-purple" />
            <h3 className="text-sm font-semibold">🏅 팬 랭킹 TOP 10</h3>
          </div>
          <div className="flex items-center gap-2">
            {([["all", "전체"], ["weekly", "주간"], ["monthly", "월간"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFanPeriod(key)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                  fanPeriod === key
                    ? "bg-primary text-primary-foreground"
                    : "glass-sm text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {fanLoading ? (
            <div className="text-center py-8 text-muted-foreground text-xs">로딩 중...</div>
          ) : fanRanking.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              {fanPeriod === "all" ? "아직 팬 활동 데이터가 없어요." : fanPeriod === "weekly" ? "이번 주 활동 데이터가 없어요." : "이번 달 활동 데이터가 없어요."}
              <br />
              투표하고 게시판에 참여해보세요! 🔥
            </div>
          ) : (
            <div className="space-y-1.5">
              {fanRanking.map((fan, idx) => {
                const medalColors = ["text-yellow-400", "text-gray-300", "text-amber-600"];
                return (
                  <div
                    key={fan.nickname}
                    className={`glass-sm px-3 py-2.5 flex items-center gap-3 ${idx < 3 ? "border border-neon-purple/20" : ""}`}
                  >
                    <div className="w-6 text-center shrink-0">
                      {idx < 3 ? (
                        <Trophy className={`w-4 h-4 mx-auto ${medalColors[idx]}`} />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold truncate ${idx === 0 ? "text-[hsl(48_96%_53%)]" : idx === 1 ? "text-muted-foreground" : idx === 2 ? "text-[hsl(31_81%_56%)]" : "text-foreground"}`}>
                          {fan.nickname}
                        </span>
                        {idx === 0 && <Star className="w-3 h-3 text-[hsl(48_96%_53%)] fill-[hsl(48_96%_53%)] shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-muted-foreground">투표 {fan.votes}</span>
                        <span className="text-[9px] text-muted-foreground">게시글 {fan.posts}</span>
                        <span className="text-[9px] text-muted-foreground">댓글 {fan.comments}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold gradient-text">{fan.score}</div>
                      <div className="text-[8px] text-muted-foreground">점</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="glass p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-neon-cyan" />
            <h3 className="text-sm font-semibold">응원 메시지</h3>
            <span className="text-xs text-muted-foreground">({comments.length})</span>
          </div>

          {/* Comment Input Form */}
          <CommentForm creatorId={creator.id} onCommentAdded={(newComment) => setComments(prev => [newComment, ...prev])} />

          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              아직 응원 메시지가 없어요.
              <br />
              첫 번째 응원을 남겨보세요! 💬
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="glass-sm px-3 py-2.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neon-purple">{c.nickname}</span>
                    <FanBadge voteCount={c.vote_count} postCount={c.post_count} />
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {formatDistanceToNow(new Date(c.created_at), { locale: ko, addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90">{c.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== Rankit 인증 배지 + 위젯 임베드 코드 + PDF 리포트 ===== */}
        <div className="glass p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Code2 className="w-4 h-4 text-neon-purple" />
            <h3 className="text-sm font-semibold">크리에이터 도구</h3>
          </div>

          {/* Rankit 인증 배지 */}
          {creator.is_verified && (
            <div className="glass-sm p-3 rounded-xl border border-neon-cyan/20 space-y-2">
              <div className="flex items-center gap-2">
                <RankitVerifiedBadge size="lg" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                이 크리에이터는 Rankit에서 공식 인증된 크리에이터입니다. 팬들에게 신뢰를 전달하세요!
              </p>
            </div>
          )}

          {/* 순위 위젯 임베드 코드 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">📦 내 순위 위젯 임베드</span>
              <button
                onClick={() => setShowEmbedModal(!showEmbedModal)}
                className="text-[10px] text-neon-cyan hover:underline"
              >
                {showEmbedModal ? "닫기" : "코드 보기"}
              </button>
            </div>
            {showEmbedModal && (
              <div className="space-y-2 animate-fade-in">
                <div className="glass-sm p-2.5 rounded-xl font-mono text-[10px] text-muted-foreground break-all border border-glass-border">
                  {`<iframe src="${getPublishedOrigin()}/widget/creator/${id}" width="300" height="120" frameborder="0" style="border-radius:16px;"></iframe>`}
                </div>
                <button
                  onClick={handleCopyEmbed}
                  className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${embedCopied ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30" : "glass-sm text-neon-cyan border border-neon-cyan/20 hover:border-neon-cyan/50"}`}
                >
                  {embedCopied ? <><Check className="w-3.5 h-3.5" /> 복사 완료!</> : <><Copy className="w-3.5 h-3.5" /> 코드 복사</>}
                </button>
                <p className="text-[10px] text-muted-foreground text-center">
                  내 사이트나 블로그에 붙여넣으면 실시간 순위가 표시됩니다
                </p>
              </div>
            )}
          </div>

          {/* 주간 PDF 리포트 */}
          <button
            onClick={handleDownloadPDF}
            disabled={pdfGenerating}
            className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all glass-sm border border-neon-purple/20 text-neon-purple hover:border-neon-purple/50 active:scale-[0.98] disabled:opacity-60"
          >
            {pdfGenerating ? (
              <><div className="w-4 h-4 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" /> 생성 중...</>
            ) : (
              <><FileDown className="w-4 h-4" /> 주간 리포트 PDF 다운로드</>
            )}
          </button>
        </div>
      </main>

      <Footer />
      {showShare && id && creator && (
        <ShareCard
          creatorId={id}
          creatorName={creator.name}
          rank={creator.rank}
          votesCount={creator.votes_count}
          onClose={() => { setShowShare(false); setAutoShareCard(false); }}
          autoGenerate={autoShareCard}
          onShareBonus={() => {
            toast.success("공유 보너스 투표권 +1! 🎁");
          }}
        />
      )}
      {showFanCert && creator && (
        <FanCertCard
          creatorName={creator.name}
          creatorAvatarUrl={creator.avatar_url}
          rank={creator.rank}
          totalCreators={totalCreators}
          onClose={() => setShowFanCert(false)}
        />
      )}

      {/* Celebration Effect */}
      <CelebrationEffect
        show={showCelebration}
        message={celebrationMsg}
        onComplete={() => setShowCelebration(false)}
      />
    </div>
  );
};

export default CreatorProfile;

