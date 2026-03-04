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
import ClaimCreatorModal from "@/components/ClaimCreatorModal";
import CelebrationEffect from "@/components/CelebrationEffect";
import FanBadge from "@/components/FanBadge";
import FanLevelBadge from "@/components/FanLevelBadge";
import FanAchievementBadges from "@/components/FanAchievementBadges";
import CreatorChat from "@/components/CreatorChat";
import RankitVerifiedBadge from "@/components/RankitVerifiedBadge";
import { generateWeeklyPDF } from "@/lib/pdfReport";
import { useHallOfFameWins, getWinTitle } from "@/hooks/useHallOfFame";
import { copyToClipboard, getPublishedOrigin } from "@/lib/clipboard";
import VoteTrendChart from "@/components/VoteTrendChart";
import VoteHeatmapChart from "@/components/VoteHeatmapChart";
import CreatorRewards from "@/components/CreatorRewards";
import CreatorOfficialFeed from "@/components/CreatorOfficialFeed";
import AICreatorInsights from "@/components/AICreatorInsights";
import { isCreatorRising } from "@/components/RisingInfluenceCreators";
import CreatorRecommendations from "@/components/CreatorRecommendations";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Crown, Heart, Trophy, TrendingUp, TrendingDown,
  ExternalLink, CheckCircle2, BarChart3, Share2, MessageCircle,
  MessageSquare, Medal, Star, Edit3, Save, X, Camera, Code2,
  FileDown, Copy, Check, Users, Activity, ChartArea,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, AreaChart,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────
interface CommentItem {
  id: string;
  nickname: string;
  message: string;
  vote_count: number;
  post_count: number;
  created_at: string;
}

type RankHistoryPoint = { recorded_at: string; rank: number; votes_count: number };
type FanPeriod = "all" | "weekly" | "monthly";
type ProfileTab = "overview" | "analytics" | "fans" | "community";

// ─── Comment Form ────────────────────────────────────────────
const CommentForm = ({ creatorId, onCommentAdded }: { creatorId: string; onCommentAdded: (c: CommentItem) => void }) => {
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimNick = nickname.trim();
    const trimMsg = message.trim();
    if (trimNick.length < 2 || trimNick.length > 20) { toast.error("닉네임은 2~20자로 입력해주세요."); return; }
    if (trimMsg.length < 2 || trimMsg.length > 50) { toast.error("메시지는 2~50자로 입력해주세요."); return; }
    setSubmitting(true);
    const { data, error } = await supabase.from("comments").insert({ creator_id: creatorId, nickname: trimNick, message: trimMsg }).select().single();
    setSubmitting(false);
    if (error) { toast.error("메시지 등록에 실패했습니다."); return; }
    if (data) { onCommentAdded(data as CommentItem); setMessage(""); toast.success("응원 메시지가 등록되었습니다! 💬"); }
  };

  return (
    <div className="glass-sm p-3 rounded-xl space-y-2">
      {!nickname.trim() || nickname.trim().length < 2 ? (
        <Input placeholder="닉네임 (2~20자)" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} className="h-8 text-xs bg-background/50 border-glass-border" />
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-neon-purple">{nickname.trim()}</span>
          <button onClick={() => setNickname("")} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">변경</button>
        </div>
      )}
      <div className="flex gap-2">
        <Input placeholder="응원 메시지를 남겨보세요! (2~50자)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={50} className="h-8 text-xs bg-background/50 border-glass-border flex-1" onKeyDown={(e) => e.key === "Enter" && !submitting && handleSubmit()} />
        <Button onClick={handleSubmit} disabled={submitting} size="sm" className="h-8 px-3 gradient-primary text-primary-foreground rounded-lg text-xs">
          {submitting ? "..." : "등록"}
        </Button>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────
const CreatorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const hallOfFameWins = useHallOfFameWins();

  // State
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
  const [feedTab, setFeedTab] = useState<"cheer" | "official">("cheer");
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [hasVotedToday, setHasVotedToday] = useState(false);
  const [isRising, setIsRising] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [creatorRes, historyRes, countRes, commentsRes] = await Promise.all([
        supabase.from("creators").select("*").eq("id", id).single(),
        supabase.from("rank_history").select("*").eq("creator_id", id).order("recorded_at", { ascending: true }).limit(50),
        supabase.from("creators").select("id", { count: "exact", head: true }),
        supabase.from("comments").select("*").eq("creator_id", id).order("created_at", { ascending: false }).limit(50),
      ]);

      if (creatorRes.error || !creatorRes.data) { toast.error("크리에이터를 찾을 수 없습니다."); navigate("/"); return; }

      const c = creatorRes.data;
      setCreator({
        id: c.id, name: c.name, category: c.category, avatar_url: c.avatar_url,
        votes_count: c.votes_count, subscriber_count: (c as any).subscriber_count ?? 0,
        rank: c.rank, previousRank: c.rank, is_verified: c.is_verified,
        channel_link: (c as any).channel_link, user_id: (c as any).user_id,
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

      // Activity data
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
      setActivityData({ posts: postsRes.count || 0, postComments: typeof postCommentsRes === "number" ? postCommentsRes : 0, postLikes: totalLikes });
      if (allCreatorsRes.data) {
        setMaxValues({
          maxSubs: Math.max(1, ...allCreatorsRes.data.map(cr => cr.subscriber_count)),
          maxVotes: Math.max(1, ...allCreatorsRes.data.map(cr => cr.votes_count)),
          maxActivity: 1,
        });
      }
      setLoading(false);
    };
    fetchData();

    const channel = supabase.channel(`creator-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "creators", filter: `id=eq.${id}` }, (payload) => {
        const u = payload.new as any;
        setCreator((prev) => prev ? { ...prev, previousRank: prev.rank, rank: u.rank, votes_count: u.votes_count } : prev);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rank_history", filter: `creator_id=eq.${id}` }, (payload) => {
        setRankHistory((prev) => [...prev.slice(-49), payload.new as RankHistoryPoint]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, navigate]);

  // Fan ranking
  const fetchFanRanking = useCallback(async (period: FanPeriod) => {
    if (!id) return;
    setFanLoading(true);
    const cutoff = period === "weekly" ? new Date(Date.now() - 7 * 86400000).toISOString() : period === "monthly" ? new Date(Date.now() - 30 * 86400000).toISOString() : null;
    const fanMap = new Map<string, { votes: number; posts: number; comments: number }>();

    let commentsQuery = supabase.from("comments").select("nickname, vote_count").eq("creator_id", id);
    if (cutoff) commentsQuery = commentsQuery.gte("created_at", cutoff);
    const { data: commentsData } = await commentsQuery;
    (commentsData || []).forEach((c) => { const entry = fanMap.get(c.nickname) || { votes: 0, posts: 0, comments: 0 }; entry.votes += c.vote_count; fanMap.set(c.nickname, entry); });

    let postsQuery = supabase.from("posts").select("nickname").eq("creator_id", id);
    if (cutoff) postsQuery = postsQuery.gte("created_at", cutoff);
    const { data: postsData } = await postsQuery;
    (postsData || []).forEach((p) => { const entry = fanMap.get(p.nickname) || { votes: 0, posts: 0, comments: 0 }; entry.posts += 1; fanMap.set(p.nickname, entry); });

    const { data: allPosts } = await supabase.from("posts").select("id").eq("creator_id", id);
    const postIds = (allPosts || []).map(p => p.id);
    if (postIds.length > 0) {
      let pcQuery = supabase.from("post_comments").select("nickname, post_id");
      if (cutoff) pcQuery = pcQuery.gte("created_at", cutoff);
      const { data: pcData } = await pcQuery;
      (pcData || []).filter(pc => postIds.includes(pc.post_id)).forEach((pc) => { const entry = fanMap.get(pc.nickname) || { votes: 0, posts: 0, comments: 0 }; entry.comments += 1; fanMap.set(pc.nickname, entry); });
    }

    setFanRanking(Array.from(fanMap.entries()).map(([nickname, data]) => ({ nickname, score: data.votes * 3 + data.posts * 2 + data.comments, ...data })).sort((a, b) => b.score - a.score).slice(0, 10));
    setFanLoading(false);
  }, [id]);

  useEffect(() => { fetchFanRanking(fanPeriod); }, [fanPeriod, fetchFanRanking]);

  useEffect(() => {
    if (!id || !user) return;
    const checkVote = async () => {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const { data } = await supabase.from("votes").select("id").eq("creator_id", id).eq("user_id", user.id).gte("created_at", todayStart.toISOString()).limit(1);
      setHasVotedToday(!!(data && data.length > 0));
    };
    checkVote();
  }, [user, id]);

  // Check if creator is rising
  useEffect(() => {
    if (!id) return;
    isCreatorRising(id).then(setIsRising);
  }, [id]);

  // ─── Handlers ───────────────────────────────────────────
  const handleVote = async () => {
    if (!id) return;
    if (!user) { toast.error("투표하려면 로그인이 필요합니다."); navigate("/auth"); return; }
    if (hasVotedToday) { toast.error("오늘 이미 투표하셨습니다! 내일 다시 투표할 수 있어요."); return; }
    setShowRankUpHint(true);
    setTimeout(() => setShowRankUpHint(false), 3000);
    const { data, error } = await supabase.functions.invoke("vote", { body: { creator_id: id } });
    if (error || data?.error) {
      setShowRankUpHint(false);
      if (data?.error === "already_voted") { toast.error("오늘 이미 이 크리에이터에게 투표하셨습니다."); setHasVotedToday(true); }
      else { toast.error(data?.message || error?.message || "투표에 실패했습니다."); }
      return;
    }
    setHasVotedToday(true); setShowRankUpHint(false);
    setCelebrationMsg("투표 완료! 🎉"); setShowCelebration(true);
    toast.success("투표 완료! 🎉"); setAutoShareCard(true); setShowShare(true);
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) { toast.error("JPG, PNG, WEBP, GIF 파일만 업로드 가능합니다."); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("이미지는 2MB 이하만 가능합니다."); return; }
    setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveEdit = async () => {
    if (!creator || !user || creator.user_id !== user.id) return;
    const { name, category, channel_link } = editForm;
    if (name.trim().length < 2 || name.length > 50) { toast.error("이름은 2~50자로 입력해주세요."); return; }
    if (category.trim().length < 1 || category.length > 20) { toast.error("카테고리는 1~20자로 입력해주세요."); return; }
    if (channel_link.trim().length < 5 || channel_link.length > 300) { toast.error("채널 링크는 5~300자로 입력해주세요."); return; }
    setEditSaving(true);
    let newAvatarUrl = creator.avatar_url;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, avatarFile, { upsert: true });
      if (uploadError) { toast.error("아바타 업로드에 실패했습니다."); setEditSaving(false); return; }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    }
    const { error } = await supabase.from("creators").update({
      name: name.trim(), category: category.trim(), channel_link: channel_link.trim(), avatar_url: newAvatarUrl,
      youtube_channel_id: editForm.youtube_channel_id.trim(), chzzk_channel_id: editForm.chzzk_channel_id.trim(),
      youtube_subscribers: parseInt(editForm.youtube_subscribers) || 0, chzzk_followers: parseInt(editForm.chzzk_followers) || 0,
      instagram_followers: parseInt(editForm.instagram_followers) || 0, tiktok_followers: parseInt(editForm.tiktok_followers) || 0,
    }).eq("id", creator.id);
    setEditSaving(false);
    if (error) { toast.error("수정에 실패했습니다."); return; }
    setCreator(prev => prev ? { ...prev, name: name.trim(), category: category.trim(), channel_link: channel_link.trim(), avatar_url: newAvatarUrl } : prev);
    setIsEditing(false); setAvatarFile(null); setAvatarPreview(null); toast.success("프로필이 수정되었습니다! ✅");
  };

  const handleDownloadPDF = async () => {
    if (!creator || !id) return;
    setPdfGenerating(true);
    try {
      const now = new Date(); const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
      const weekLabel = `${weekStart.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} ~ ${now.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}`;
      const cd = rankHistory.map((h) => ({ time: new Date(h.recorded_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }), rank: h.rank, votes: h.votes_count }));
      generateWeeklyPDF({ name: creator.name, category: creator.category, rank: creator.rank, votes_count: creator.votes_count, rankit_score: creator.rankit_score, youtube_subscribers: creator.youtube_subscribers, chzzk_followers: creator.chzzk_followers, instagram_followers: creator.instagram_followers, tiktok_followers: creator.tiktok_followers, is_verified: creator.is_verified, rankHistory: cd, fanRanking, weekLabel });
      toast.success("PDF 리포트가 다운로드되었습니다! 📄");
    } catch { toast.error("PDF 생성에 실패했습니다."); }
    finally { setPdfGenerating(false); }
  };

  const handleCopyEmbed = async () => {
    if (!id) return;
    const origin = getPublishedOrigin();
    const embedCode = `<iframe src="${origin}/widget/creator/${id}" width="300" height="120" frameborder="0" style="border-radius:16px; overflow:hidden;"></iframe>`;
    const ok = await copyToClipboard(embedCode);
    if (ok) { setEmbedCopied(true); toast.success("임베드 코드가 복사되었습니다! 🎉"); setTimeout(() => setEmbedCopied(false), 2500); }
  };

  // ─── Loading ────────────────────────────────────────────
  if (loading || !creator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">로딩 중...</div>
      </div>
    );
  }

  // ─── Computed ───────────────────────────────────────────
  const chartData = rankHistory.map((h) => ({ time: new Date(h.recorded_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }), rank: h.rank, votes: h.votes_count }));
  if (chartData.length === 0) chartData.push({ time: "현재", rank: creator.rank, votes: creator.votes_count });

  const topPercent = totalCreators > 0 ? Math.round((creator.rank / totalCreators) * 100) : 0;
  const activityScore = activityData.postComments + activityData.posts * 2 + activityData.postLikes;

  const wins = hallOfFameWins[creator.id] || 0;
  const winTitle = getWinTitle(wins);

  // ─── Tab Config ─────────────────────────────────────────
  const tabs: { key: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "개요", icon: <Activity className="w-4 h-4" /> },
    { key: "analytics", label: "분석", icon: <ChartArea className="w-4 h-4" /> },
    { key: "fans", label: "팬", icon: <Users className="w-4 h-4" /> },
    { key: "community", label: "커뮤니티", icon: <MessageCircle className="w-4 h-4" /> },
  ];

  // ─── SNS Links ──────────────────────────────────────────
  const SnsLinks = () => (
    <div className="flex items-center gap-2">
      {creator.youtube_channel_id && (
        <a href={`https://youtube.com/channel/${creator.youtube_channel_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 hover:bg-destructive/20 transition-colors" title="YouTube">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-destructive" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        </a>
      )}
      {creator.chzzk_channel_id && (
        <a href={`https://chzzk.naver.com/${creator.chzzk_channel_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 hover:bg-green-500/20 transition-colors" title="치지직">
          <span className="text-xs font-black text-green-500">치</span>
        </a>
      )}
      {creator.channel_link && (
        <a href={creator.channel_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-secondary/10 hover:bg-secondary/20 transition-colors" title="채널">
          <ExternalLink className="w-3.5 h-3.5 text-secondary" />
        </a>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead title={`${creator.name} - 크리에이터 프로필`} description={`${creator.name}의 랭킹, 투표 현황, 팬 활동을 확인하세요. 현재 ${creator.rank}위, ${creator.votes_count}표 획득!`} path={`/creator/${creator.id}`} ogImage={creator.avatar_url || undefined} />

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50 md:hidden">
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex items-center gap-2 flex-1">
            <Crown className="w-5 h-5 text-neon-purple" />
            <span className="text-lg font-bold gradient-text">프로필</span>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-0">

        {/* ═══════════════════════════════════════════════════ */}
        {/* PROFILE HEADER - Always visible                    */}
        {/* ═══════════════════════════════════════════════════ */}
        <div className="glass p-5 rounded-2xl space-y-4 animate-fade-in-up">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              {isEditing ? (
                <button type="button" onClick={() => avatarInputRef.current?.click()} className="relative group">
                  {(avatarPreview || creator.avatar_url) ? (
                    <img src={avatarPreview || creator.avatar_url} alt={creator.name} className="w-20 h-20 rounded-full object-cover ring-3 ring-primary/30 ring-offset-2 ring-offset-background" />
                  ) : (
                    <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground">{creator.name.slice(0, 2)}</div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="w-6 h-6 text-primary-foreground" /></div>
                  <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />
                </button>
              ) : (
                <>
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt={creator.name} className="w-20 h-20 rounded-full object-cover ring-3 ring-primary/30 ring-offset-2 ring-offset-background" />
                  ) : (
                    <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground shadow-xl shadow-primary/30">
                      {creator.rank <= 3 ? <Trophy className="w-8 h-8" /> : creator.name.slice(0, 2)}
                    </div>
                  )}
                </>
              )}
              {creator.is_verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-background" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              {isEditing ? (
                /* Edit Form inline */
                <div className="space-y-2">
                  <Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} className="glass-sm border-glass-border h-8 text-sm" maxLength={50} placeholder="이름" />
                  <Input value={editForm.category} onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))} className="glass-sm border-glass-border h-8 text-sm" maxLength={20} placeholder="카테고리" />
                  <Input value={editForm.channel_link} onChange={(e) => setEditForm(f => ({ ...f, channel_link: e.target.value }))} className="glass-sm border-glass-border h-8 text-sm" maxLength={300} placeholder="채널 링크" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={editForm.youtube_channel_id} onChange={(e) => setEditForm(f => ({ ...f, youtube_channel_id: e.target.value }))} className="glass-sm border-glass-border h-7 text-[11px]" placeholder="YouTube ID" />
                    <Input value={editForm.chzzk_channel_id} onChange={(e) => setEditForm(f => ({ ...f, chzzk_channel_id: e.target.value }))} className="glass-sm border-glass-border h-7 text-[11px]" placeholder="치지직 ID" />
                    <Input type="number" value={editForm.youtube_subscribers} onChange={(e) => setEditForm(f => ({ ...f, youtube_subscribers: e.target.value }))} className="glass-sm border-glass-border h-7 text-[11px]" placeholder="YT 구독자" />
                    <Input type="number" value={editForm.chzzk_followers} onChange={(e) => setEditForm(f => ({ ...f, chzzk_followers: e.target.value }))} className="glass-sm border-glass-border h-7 text-[11px]" placeholder="치지직 팔로워" />
                    <Input type="number" value={editForm.instagram_followers} onChange={(e) => setEditForm(f => ({ ...f, instagram_followers: e.target.value }))} className="glass-sm border-glass-border h-7 text-[11px]" placeholder="인스타 팔로워" />
                    <Input type="number" value={editForm.tiktok_followers} onChange={(e) => setEditForm(f => ({ ...f, tiktok_followers: e.target.value }))} className="glass-sm border-glass-border h-7 text-[11px]" placeholder="틱톡 팔로워" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdit} disabled={editSaving} size="sm" className="flex-1 gradient-primary text-primary-foreground text-xs"><Save className="w-3 h-3 mr-1" />{editSaving ? "저장 중..." : "저장"}</Button>
                    <Button onClick={() => { setIsEditing(false); setAvatarFile(null); setAvatarPreview(null); }} variant="outline" size="sm" className="glass-sm border-glass-border"><X className="w-3 h-3" /></Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-lg font-bold text-foreground leading-tight truncate">
                    {creator.name}
                    {creator.is_verified && <CheckCircle2 className="w-4 h-4 text-secondary inline ml-1 -translate-y-px" />}
                    {winTitle && <span className="inline-flex items-center gap-1 ml-1.5"><Crown className="w-4 h-4 text-yellow-400 inline" /><span className="text-[10px] font-bold text-yellow-400">{winTitle}</span></span>}
                  </h1>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {creator.category && (
                      <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{creator.category}</span>
                    )}
                    {isRising && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-500 animate-pulse">
                        🔥 Rising Creator
                      </span>
                    )}
                  </div>
                  <SnsLinks />
                </>
              )}
            </div>
          </div>

          {/* Rank-up hint */}
          {showRankUpHint && (
            <div className="glass-sm p-3 rounded-xl border border-secondary/30 animate-fade-in text-center space-y-1">
              <div className="text-sm font-bold text-secondary">📊 순위 상승 가능성 분석</div>
              <div className="flex items-center justify-center gap-3">
                <span className="text-xs text-muted-foreground">현재 <span className="font-bold text-foreground">#{creator.rank}</span></span>
                <TrendingUp className="w-4 h-4 text-secondary animate-bounce" />
                <span className="text-xs text-secondary font-bold">순위 상승 중...</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleVote} disabled={hasVotedToday} className="flex-1 h-11 font-bold gradient-primary text-primary-foreground rounded-xl neon-glow-purple disabled:opacity-50">
              <Heart className="w-4 h-4 mr-2" />
              {hasVotedToday ? "오늘 투표 완료 ✓" : "투표하기"}
            </Button>
            <Button onClick={() => setShowShare(true)} variant="outline" className="h-11 px-3 rounded-xl glass-sm border-glass-border">
              <Share2 className="w-4 h-4 text-secondary" />
            </Button>
            <button onClick={() => setShowFanCert(true)} className="h-11 px-3 rounded-xl glass-sm border border-primary/20 hover:border-primary/40 transition-colors flex items-center">
              <span className="text-sm">📸</span>
            </button>
          </div>

          {!user && (
            <p className="text-xs text-center text-muted-foreground">
              <button onClick={() => navigate("/auth")} className="text-secondary underline underline-offset-2">로그인하고 투표에 참여하세요</button>
            </p>
          )}

          {/* Owner Edit */}
          {!isEditing && user && creator.user_id === user.id && (
            <Button
              onClick={() => {
                setEditForm({ name: creator.name, category: creator.category, channel_link: creator.channel_link || "", youtube_channel_id: (creator as any).youtube_channel_id || "", chzzk_channel_id: (creator as any).chzzk_channel_id || "", instagram_id: "", tiktok_id: "", youtube_subscribers: String((creator as any).youtube_subscribers || 0), chzzk_followers: String((creator as any).chzzk_followers || 0), instagram_followers: String((creator as any).instagram_followers || 0), tiktok_followers: String((creator as any).tiktok_followers || 0) });
                setAvatarFile(null); setAvatarPreview(null); setIsEditing(true);
              }}
              variant="outline" size="sm"
              className="w-full glass-sm border-secondary/30 text-secondary text-xs rounded-xl"
            >
              <Edit3 className="w-3 h-3 mr-1" /> 프로필 수정
            </Button>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* TAB BAR                                            */}
        {/* ═══════════════════════════════════════════════════ */}
        <div className="sticky top-0 md:top-14 z-30 -mx-4 px-4 pt-3 pb-0">
          <div className="glass rounded-xl p-1 flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.key
                    ? "gradient-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* TAB CONTENT                                        */}
        {/* ═══════════════════════════════════════════════════ */}
        <div className="pt-4 space-y-4">

          {/* ─── TAB: OVERVIEW ─── */}
          {activeTab === "overview" && (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="glass-sm p-3 text-center space-y-0.5">
                  <div className="text-xl font-bold gradient-text">{creator.rank}</div>
                  <div className="text-[10px] text-muted-foreground">현재 순위</div>
                </div>
                <div className="glass-sm p-3 text-center space-y-0.5">
                  <div className="text-xl font-bold text-secondary">{topPercent <= 0 ? "—" : `${topPercent}%`}</div>
                  <div className="text-[10px] text-muted-foreground">상위 퍼센트</div>
                </div>
                <div className="glass-sm p-3 text-center space-y-0.5">
                  <div className="text-sm font-bold text-green-500">{activityScore}</div>
                  <div className="text-[10px] text-muted-foreground">활동 점수</div>
                </div>
              </div>

              {/* AI Influence Score - prominently displayed */}
              <AICreatorInsights creatorId={id!} />

              {/* Detail Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="glass-sm p-3 text-center space-y-0.5">
                  <div className="text-sm font-bold text-primary">{creator.subscriber_count.toLocaleString()}</div>
                  <div className="text-[9px] text-muted-foreground">총 구독자</div>
                </div>
                <div className="glass-sm p-3 text-center space-y-0.5">
                  <div className="text-sm font-bold text-secondary">{creator.votes_count.toLocaleString()}</div>
                  <div className="text-[9px] text-muted-foreground">총 투표</div>
                </div>
                <div className="glass-sm p-3 text-center space-y-0.5">
                  <div className="text-sm font-bold text-green-500">{activityScore}</div>
                  <div className="text-[9px] text-muted-foreground">활동 점수</div>
                </div>
              </div>

              {/* Creator Tools */}
              <div className="glass p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Code2 className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">크리에이터 도구</h3>
                </div>
                {creator.is_verified && (
                  <div className="glass-sm p-3 rounded-xl border border-secondary/20 space-y-2">
                    <RankitVerifiedBadge size="lg" />
                    <p className="text-[11px] text-muted-foreground">이 크리에이터는 Rankit에서 공식 인증된 크리에이터입니다.</p>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">📦 내 순위 위젯 임베드</span>
                    <button onClick={() => setShowEmbedModal(!showEmbedModal)} className="text-[10px] text-secondary hover:underline">{showEmbedModal ? "닫기" : "코드 보기"}</button>
                  </div>
                  {showEmbedModal && (
                    <div className="space-y-2 animate-fade-in">
                      <div className="glass-sm p-2.5 rounded-xl font-mono text-[10px] text-muted-foreground break-all border border-glass-border">
                        {`<iframe src="${getPublishedOrigin()}/widget/creator/${id}" width="300" height="120" frameborder="0" style="border-radius:16px;"></iframe>`}
                      </div>
                      <button onClick={handleCopyEmbed} className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${embedCopied ? "bg-secondary/20 text-secondary border border-secondary/30" : "glass-sm text-secondary border border-secondary/20 hover:border-secondary/50"}`}>
                        {embedCopied ? <><Check className="w-3.5 h-3.5" /> 복사 완료!</> : <><Copy className="w-3.5 h-3.5" /> 코드 복사</>}
                      </button>
                    </div>
                  )}
                </div>
                {creator && <CreatorRewards creatorId={creator.id} currentVotes={creator.votes_count} />}
                <button onClick={handleDownloadPDF} disabled={pdfGenerating} className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 glass-sm border border-primary/20 text-primary hover:border-primary/50 active:scale-[0.98] disabled:opacity-60">
                  {pdfGenerating ? <><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> 생성 중...</> : <><FileDown className="w-4 h-4" /> 주간 리포트 PDF</>}
                </button>
              </div>
            </>
          )}

          {/* ─── TAB: ANALYTICS ─── */}
          {activeTab === "analytics" && (
            <>
              {/* AI Insights */}
              <AICreatorInsights creatorId={id!} />

              {/* Rank Chart */}
              <div className="glass p-4 space-y-3">
                <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /><h3 className="text-sm font-semibold">순위 변동</h3></div>
                {chartData.length <= 1 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">아직 순위 변동 기록이 없어요.<br />투표가 진행되면 그래프가 나타납니다!</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis reversed domain={[1, "auto"]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} formatter={(value: number) => [`${value}위`, "순위"]} />
                      <Line type="monotone" dataKey="rank" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} activeDot={{ r: 5, fill: "hsl(var(--secondary))" }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Votes Chart */}
              <div className="glass p-4 space-y-3">
                <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-secondary" /><h3 className="text-sm font-semibold">투표 추이</h3></div>
                {chartData.length <= 1 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">투표 데이터가 쌓이면 그래프가 나타납니다!</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData}>
                      <defs><linearGradient id="voteGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} formatter={(value: number) => [`${value.toLocaleString()}표`, "투표수"]} />
                      <Area type="monotone" dataKey="votes" stroke="hsl(var(--secondary))" strokeWidth={2} fill="url(#voteGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* 7-Day Vote Trend */}
              <div className="glass p-4 space-y-3">
                <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-secondary" /><h3 className="text-sm font-semibold">📈 최근 7일 득표 추이</h3></div>
                <VoteTrendChart creatorId={id!} />
              </div>

              {/* Vote Heatmap */}
              <div className="glass p-4 space-y-3">
                <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-orange-400" /><h3 className="text-sm font-semibold">🔥 시간대별 화력 분석</h3></div>
                <VoteHeatmapChart creatorId={id!} />
              </div>

              {/* Similar Creator Recommendations */}
              <CreatorRecommendations
                mode="similar"
                creatorId={id!}
                title="이 크리에이터의 팬이 좋아하는"
                subtitle="AI 추천"
              />
            </>
          )}

          {/* ─── TAB: FANS ─── */}
          {activeTab === "fans" && (
            <>
              <div className="glass p-4 space-y-3">
                <div className="flex items-center gap-2"><Medal className="w-4 h-4 text-primary" /><h3 className="text-sm font-semibold">🏅 팬 랭킹 TOP 10</h3></div>
                <div className="flex items-center gap-2">
                  {([["all", "전체"], ["weekly", "주간"], ["monthly", "월간"]] as const).map(([key, label]) => (
                    <button key={key} onClick={() => setFanPeriod(key)} className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${fanPeriod === key ? "bg-primary text-primary-foreground" : "glass-sm text-muted-foreground hover:text-foreground"}`}>{label}</button>
                  ))}
                </div>
                {fanLoading ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">로딩 중...</div>
                ) : fanRanking.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    {fanPeriod === "all" ? "아직 팬 활동 데이터가 없어요." : fanPeriod === "weekly" ? "이번 주 활동 데이터가 없어요." : "이번 달 활동 데이터가 없어요."}
                    <br />투표하고 게시판에 참여해보세요! 🔥
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {fanRanking.map((fan, idx) => {
                      const medalColors = ["text-yellow-400", "text-gray-300", "text-amber-600"];
                      return (
                        <div key={fan.nickname} className={`glass-sm px-3 py-2.5 flex items-center gap-3 ${idx < 3 ? "border border-primary/20" : ""}`}>
                          <div className="w-6 text-center shrink-0">
                            {idx < 3 ? <Trophy className={`w-4 h-4 mx-auto ${medalColors[idx]}`} /> : <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold truncate ${idx === 0 ? "text-yellow-400" : "text-foreground"}`}>{fan.nickname}</span>
                              {idx === 0 && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />}
                              <FanLevelBadge activity={{ votes: fan.votes, posts: fan.posts, comments: fan.comments }} />
                              <FanAchievementBadges activity={{ votes: fan.votes, posts: fan.posts, comments: fan.comments }} />
                              <FanBadge voteCount={fan.votes} postCount={fan.posts} />
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

              {/* Board Link */}
              <Link to={`/creator/${id}/board`} className="block w-full glass p-4 text-center text-sm font-medium text-secondary hover:border-secondary/50 transition-all rounded-2xl">
                <span className="inline-flex items-center gap-2"><MessageSquare className="w-4 h-4" />팬 게시판 바로가기</span>
              </Link>
            </>
          )}

          {/* ─── TAB: COMMUNITY ─── */}
          {activeTab === "community" && (
            <>
              {/* Cheer / Official Feed Tabs */}
              <div className="glass p-4 space-y-3">
                <div className="flex gap-1 p-0.5 rounded-xl bg-muted/50">
                  <button onClick={() => setFeedTab("cheer")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${feedTab === "cheer" ? "gradient-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>💬 응원톡</button>
                  <button onClick={() => setFeedTab("official")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${feedTab === "official" ? "gradient-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>✨ 공식 피드</button>
                </div>

                {feedTab === "cheer" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-secondary" />
                      <h3 className="text-sm font-semibold">응원 메시지</h3>
                      <span className="text-xs text-muted-foreground">({comments.length})</span>
                    </div>
                    <CommentForm creatorId={creator.id} onCommentAdded={(newComment) => setComments(prev => [newComment, ...prev])} />
                    {comments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs">아직 응원 메시지가 없어요.<br />첫 번째 응원을 남겨보세요! 💬</div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {comments.map((c) => (
                          <div key={c.id} className="glass-sm px-3 py-2.5 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-primary">{c.nickname}</span>
                              <FanBadge voteCount={c.vote_count} postCount={c.post_count} />
                              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{formatDistanceToNow(new Date(c.created_at), { locale: ko, addSuffix: true })}</span>
                            </div>
                            <p className="text-xs text-foreground/90">{c.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {feedTab === "official" && creator && (
                  <CreatorOfficialFeed creatorId={creator.id} creatorName={creator.name} creatorAvatar={creator.avatar_url} creatorUserId={creator.user_id} isVerified={creator.is_verified} />
                )}
              </div>

              {/* Real-time Chat */}
              <div className="glass p-4 space-y-3">
                <CreatorChat creatorId={id!} creatorName={creator.name} />
              </div>

              {/* Board Link */}
              <Link to={`/creator/${id}/board`} className="block w-full glass p-4 text-center text-sm font-medium text-secondary hover:border-secondary/50 transition-all rounded-2xl">
                <span className="inline-flex items-center gap-2"><MessageSquare className="w-4 h-4" />팬 게시판 바로가기</span>
              </Link>
            </>
          )}
        </div>
      </main>

      <Footer />

      {/* Modals */}
      {showShare && id && creator && (
        <ShareCard creatorId={id} creatorName={creator.name} rank={creator.rank} votesCount={creator.votes_count} avatarUrl={creator.avatar_url} category={creator.category} rankitScore={creator.rankit_score} onClose={() => { setShowShare(false); setAutoShareCard(false); }} autoGenerate={autoShareCard} onShareBonus={() => toast.success("공유 보너스 투표권 +1! 🎁")} />
      )}
      {showFanCert && creator && (
        <FanCertCard creatorName={creator.name} creatorAvatarUrl={creator.avatar_url} creatorId={creator.id} rank={creator.rank} totalCreators={totalCreators} username={user?.email?.split("@")[0]} totalVotes={fanRanking.find(f => f.nickname === user?.email?.split("@")[0])?.votes || 0} totalPosts={fanRanking.find(f => f.nickname === user?.email?.split("@")[0])?.posts || 0} totalComments={fanRanking.find(f => f.nickname === user?.email?.split("@")[0])?.comments || 0} onClose={() => setShowFanCert(false)} />
      )}
      <CelebrationEffect show={showCelebration} message={celebrationMsg} onComplete={() => setShowCelebration(false)} />
    </div>
  );
};

export default CreatorProfile;
