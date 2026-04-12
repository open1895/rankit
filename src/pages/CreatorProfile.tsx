import { useState, useEffect, useCallback, useRef, lazy, Suspense, ChangeEvent } from "react";
import Footer from "@/components/Footer";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
const ShareCard = lazy(() => import("@/components/ShareCard"));
const FanCertCard = lazy(() => import("@/components/FanCertCard"));
const ClaimCreatorModal = lazy(() => import("@/components/ClaimCreatorModal"));
import CelebrationEffect from "@/components/CelebrationEffect";
const TournamentChampionBadge = lazy(() => import("@/components/TournamentChampionBadge"));
const PromotionRequestModal = lazy(() => import("@/components/PromotionRequestModal"));
// pdfReport is dynamically imported in handleDownloadPDF
import { useHallOfFameWins, getWinTitle } from "@/hooks/useHallOfFame";
import { copyToClipboard, getPublishedOrigin } from "@/lib/clipboard";
import { isCreatorRising } from "@/components/RisingInfluenceCreators";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Crown, Heart, Trophy, TrendingUp,
  CheckCircle2, Share2, Edit3, Save, X, Camera, Shield,
  Activity, ChartArea, Users, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

// Extracted components
import SnsLinks from "@/components/creator-profile/SnsLinks";
const OverviewTab = lazy(() => import("@/components/creator-profile/OverviewTab"));
const AnalyticsTab = lazy(() => import("@/components/creator-profile/AnalyticsTab"));
const FansTab = lazy(() => import("@/components/creator-profile/FansTab"));
const CommunityTab = lazy(() => import("@/components/creator-profile/CommunityTab"));
import {
  CreatorProfileData, CommentItem, RankHistoryPoint,
  FanPeriod, FanRankingEntry, ProfileTab,
} from "@/components/creator-profile/types";

// ─── Constants ───────────────────────────────────────────────
const PROFILE_TABS: { key: ProfileTab; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "개요", icon: <Activity className="w-4 h-4" /> },
  { key: "analytics", label: "분석", icon: <ChartArea className="w-4 h-4" /> },
  { key: "fans", label: "팬", icon: <Users className="w-4 h-4" /> },
  { key: "community", label: "커뮤니티", icon: <MessageCircle className="w-4 h-4" /> },
];

// ─── Main Component ──────────────────────────────────────────
const CreatorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const hallOfFameWins = useHallOfFameWins();
  const timersRef = useRef<number[]>([]);

  // State
  const [creator, setCreator] = useState<CreatorProfileData | null>(null);
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
  const [fanRanking, setFanRanking] = useState<FanRankingEntry[]>([]);
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
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [useSuperVote, setUseSuperVote] = useState(false);
  const [searchParams] = useSearchParams();
  const [superVotes, setSuperVotes] = useState(0);
  const [comboCount, setComboCount] = useState(0);

  // Timer cleanup
  const addTimer = useCallback((fn: () => void, ms: number) => {
    const tid = window.setTimeout(fn, ms);
    timersRef.current.push(tid);
    return tid;
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  // ─── Data Fetching ──────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [creatorRes, historyRes, countRes, commentsRes] = await Promise.all([
        supabase.from("creators").select("id, name, category, avatar_url, votes_count, subscriber_count, rank, is_verified, channel_link, user_id, youtube_channel_id, chzzk_channel_id, youtube_subscribers, chzzk_followers, instagram_followers, tiktok_followers, rankit_score, verification_status, is_promoted, promotion_type, promotion_status, claimed, instagram_handle, performance_tier, featured_until").eq("id", id).single(),
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
        verification_status: (c as any).verification_status || "none",
        performance_tier: (c as any).performance_tier || "none",
        featured_until: (c as any).featured_until || null,
      });
      setRankHistory(historyRes.data || []);
      setComments(commentsRes.data || []);
      setTotalCreators(countRes.count || 0);

      // Activity data via RPC
      const { data: activityStats } = await supabase.rpc("get_creator_activity_stats", { p_creator_id: c.id });
      if (activityStats && activityStats.length > 0) {
        const stats = activityStats[0];
        setActivityData({
          posts: Number(stats.post_count) || 0,
          postComments: Number(stats.comment_count) || 0,
          postLikes: Number(stats.like_count) || 0,
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

  useEffect(() => { if (!id) return; isCreatorRising(id).then(setIsRising); }, [id]);

  // ─── Handlers ───────────────────────────────────────────
  const handleVote = async () => {
    if (!id) return;
    if (!user) { toast.error("투표하려면 로그인이 필요합니다."); navigate("/auth"); return; }
    if (hasVotedToday) { toast.error("오늘 이미 투표하셨습니다! 내일 다시 투표할 수 있어요."); return; }
    setShowRankUpHint(true);
    addTimer(() => setShowRankUpHint(false), 3000);
    const { data, error } = await supabase.functions.invoke("vote", { body: { creator_id: id, use_super: useSuperVote } });

    const errorBody = data?.error || (error && typeof error === 'object' && 'context' in error ? await (error as any).context?.json?.().catch(() => null) : null);
    const isAlreadyVoted = data?.error === "already_voted" || (error?.message && error.message.includes("already_voted")) || errorBody?.error === "already_voted";

    if (error || data?.error) {
      setShowRankUpHint(false);
      if (isAlreadyVoted) { toast.error("오늘 이미 이 크리에이터에게 투표하셨습니다."); setHasVotedToday(true); }
      else { toast.error(data?.message || errorBody?.message || error?.message || "투표에 실패했습니다."); }
      return;
    }
    setHasVotedToday(true); setShowRankUpHint(false);

    if (data?.combo_count > 1) {
      setComboCount(data.combo_count);
      toast.success(data.combo_bonus > 0 ? `🔥 ${data.combo_count} COMBO! +${data.combo_bonus} 보너스 티켓 획득!` : `🔥 ${data.combo_count} COMBO!`);
    }

    if (data?.used_super) {
      setCelebrationMsg(`⚡ 슈퍼투표! +${data.vote_weight}표 반영!`);
      setSuperVotes(prev => Math.max(0, prev - 1));
      setUseSuperVote(false);
    } else {
      setCelebrationMsg("투표 완료! 🎉");
    }

    setShowCelebration(true);
    toast.success(data?.used_super ? `⚡ 슈퍼투표 완료! +${data.vote_weight}표` : "투표 완료! 🎉");
    setAutoShareCard(true); setShowShare(true);
  };

  useEffect(() => {
    if (!user) return;
    supabase.functions.invoke("tickets", { body: { action: "get_balance" } }).then(({ data }) => {
      if (data?.super_votes) setSuperVotes(data.super_votes);
    });
  }, [user]);

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
      const { generateWeeklyPDF } = await import("@/lib/pdfReport");
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
    if (ok) { setEmbedCopied(true); toast.success("임베드 코드가 복사되었습니다! 🎉"); addTimer(() => setEmbedCopied(false), 2500); }
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
  const embedCode = `<iframe src="${getPublishedOrigin()}/widget/creator/${id}" width="300" height="120" frameborder="0" style="border-radius:16px;"></iframe>`;

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead title={`${creator.name} - 크리에이터 프로필`} description={`${creator.name}의 랭킹, 투표 현황, 팬 활동을 확인하세요. 현재 ${creator.rank}위, ${creator.votes_count.toLocaleString()}표 획득!`} path={`/creator/${creator.id}`} ogImage={`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'jcaajxwdeqngihupjaaa'}.supabase.co/functions/v1/og-image?creator_id=${creator.id}&v=1`} ogType="profile" />

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

        {/* PROFILE HEADER */}
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
                    <TournamentChampionBadge creatorId={creator.id} />
                  </div>
                  <SnsLinks channelLink={creator.channel_link} youtubeChannelId={creator.youtube_channel_id} chzzkChannelId={creator.chzzk_channel_id} />
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

          {/* Super Vote Toggle */}
          {user && superVotes > 0 && !hasVotedToday && (
            <div className="flex items-center justify-between glass-sm rounded-xl p-2.5 border border-accent/30">
              <div className="flex items-center gap-2">
                <span className="text-sm">⚡</span>
                <div>
                  <p className="text-xs font-bold text-accent">슈퍼투표 사용</p>
                  <p className="text-[10px] text-muted-foreground">1표가 3표로! (보유: {superVotes}개)</p>
                </div>
              </div>
              <button onClick={() => setUseSuperVote(!useSuperVote)} className={`w-10 h-5 rounded-full transition-colors ${useSuperVote ? "bg-accent" : "bg-muted"} relative`}>
                <div className={`w-4 h-4 rounded-full bg-foreground absolute top-0.5 transition-all ${useSuperVote ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          )}

          {/* Combo Counter */}
          {comboCount > 1 && (
            <div className="text-center animate-fade-in">
              <span className="inline-block px-4 py-1.5 rounded-full bg-orange-500/20 text-orange-400 text-sm font-black">
                🔥 {comboCount} COMBO
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleVote} disabled={hasVotedToday} className={`flex-1 h-11 rounded-xl text-sm font-bold gap-1.5 transition-all ${hasVotedToday ? "glass-sm border-muted/30 text-muted-foreground" : useSuperVote ? "bg-accent text-accent-foreground shadow-lg shadow-accent/30" : "gradient-primary text-primary-foreground shadow-lg shadow-primary/30"}`}>
              {useSuperVote ? <span>⚡</span> : <Heart className="w-4 h-4" />}
              {hasVotedToday ? "오늘 투표 완료 ✓" : useSuperVote ? "슈퍼투표 ×3" : "투표하기"}
            </Button>
            <Button onClick={() => setShowShare(true)} variant="outline" className="h-11 px-3 rounded-xl glass-sm border-glass-border">
              <Share2 className="w-4 h-4" />
            </Button>
            <button onClick={() => setShowFanCert(true)} className="h-11 px-3 rounded-xl glass-sm border border-primary/20 hover:border-primary/40 transition-colors flex items-center">
              📸
            </button>
          </div>

          {!user && (
            <div className="text-center text-xs text-muted-foreground py-1">
              <button onClick={() => navigate("/auth")} className="text-secondary underline underline-offset-2">로그인하고 투표에 참여하세요</button>
            </div>
          )}

          {/* Owner Edit */}
          {!isEditing && user && creator.user_id === user.id && (
            <div className="space-y-2">
              <Button
                onClick={() => {
                  setEditForm({ name: creator.name, category: creator.category, channel_link: creator.channel_link || "", youtube_channel_id: creator.youtube_channel_id || "", chzzk_channel_id: creator.chzzk_channel_id || "", instagram_id: "", tiktok_id: "", youtube_subscribers: String(creator.youtube_subscribers || 0), chzzk_followers: String(creator.chzzk_followers || 0), instagram_followers: String(creator.instagram_followers || 0), tiktok_followers: String(creator.tiktok_followers || 0) });
                  setAvatarFile(null); setAvatarPreview(null); setIsEditing(true);
                }}
                variant="outline" size="sm"
                className="w-full glass-sm border-secondary/30 text-secondary text-xs rounded-xl"
              >
                <Edit3 className="w-3 h-3 mr-1" /> 프로필 수정
              </Button>
              {(creator as any).promotion_status !== "pending" && (
                <Button onClick={() => setShowPromotionModal(true)} variant="outline" size="sm" className="w-full glass-sm border-yellow-500/30 text-yellow-500 text-xs rounded-xl hover:border-yellow-500/60">
                  <TrendingUp className="w-3 h-3 mr-1" /> 프로필 홍보하기
                </Button>
              )}
            </div>
          )}

          {/* Active Promotion Badge */}
          {(creator as any).is_promoted && (creator as any).promotion_status === "approved" && (creator as any).promotion_end && new Date((creator as any).promotion_end) > new Date() && (
            <div className="text-center">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-yellow-500/15 text-yellow-500">
                {(creator as any).promotion_type === "featured" ? "⭐ Featured Creator" : "🚀 Rising Creator"}
              </span>
            </div>
          )}

          {/* Promotion Pending */}
          {(creator as any).promotion_status === "pending" && user && creator.user_id === user.id && (
            <div className="glass-sm p-3 rounded-xl border border-yellow-500/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-xs font-semibold text-yellow-500">프로모션 심사 중</span>
              </div>
            </div>
          )}

          {/* Claim Profile Button */}
          {!isEditing && user && !creator.user_id && creator.verification_status !== "pending" && (
            <Button onClick={() => setShowClaimModal(true)} variant="outline" size="sm" className="w-full glass-sm border-[hsl(var(--neon-cyan)/0.3)] text-[hsl(var(--neon-cyan))] text-xs rounded-xl hover:border-[hsl(var(--neon-cyan)/0.6)]">
              <Shield className="w-3 h-3 mr-1" />
              {creator.verification_status === "rejected" ? "인증 재신청하기" : "이 크리에이터 프로필 인증하기"}
            </Button>
          )}

          {/* Pending status indicator */}
          {creator.verification_status === "pending" && (
            <div className="glass-sm p-3 rounded-xl border border-yellow-500/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-xs font-semibold text-yellow-500">인증 심사 중</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">관리자 심사가 진행 중입니다. 결과는 알림으로 안내됩니다.</p>
            </div>
          )}
        </div>

        {/* TAB BAR */}
        <div className="sticky top-0 md:top-14 z-30 -mx-4 px-4 pt-3 pb-0">
          <div className="glass rounded-xl p-1 flex gap-1">
            {PROFILE_TABS.map((tab) => (
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

        {/* TAB CONTENT */}
        <div className="pt-4 space-y-4">
          <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
          {activeTab === "overview" && (
            <OverviewTab
              creator={creator}
              creatorId={id!}
              topPercent={topPercent}
              activityScore={activityScore}
              showEmbedModal={showEmbedModal}
              setShowEmbedModal={setShowEmbedModal}
              embedCopied={embedCopied}
              handleCopyEmbed={handleCopyEmbed}
              embedCode={embedCode}
              pdfGenerating={pdfGenerating}
              handleDownloadPDF={handleDownloadPDF}
            />
          )}
          {activeTab === "analytics" && (
            <AnalyticsTab creatorId={id!} chartData={chartData} />
          )}
          {activeTab === "fans" && (
            <FansTab
              creatorId={id!}
              fanRanking={fanRanking}
              fanPeriod={fanPeriod}
              setFanPeriod={setFanPeriod}
              fanLoading={fanLoading}
            />
          )}
          {activeTab === "community" && (
            <CommunityTab
              creatorId={id!}
              creatorName={creator.name}
              creatorAvatar={creator.avatar_url}
              creatorUserId={creator.user_id}
              isVerified={creator.is_verified}
              comments={comments}
              onCommentAdded={(c) => setComments(prev => [c, ...prev])}
              feedTab={feedTab}
              setFeedTab={setFeedTab}
            />
          )}
          </Suspense>
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <Suspense fallback={null}>
        {showShare && id && creator && (
          <ShareCard creatorId={id} creatorName={creator.name} rank={creator.rank} votesCount={creator.votes_count} avatarUrl={creator.avatar_url} category={creator.category} rankitScore={creator.rankit_score} onClose={() => { setShowShare(false); setAutoShareCard(false); }} autoGenerate={autoShareCard} onShareBonus={() => toast.success("공유 보너스 투표권 +1! 🎁")} />
        )}
        {showFanCert && creator && (
          <FanCertCard creatorName={creator.name} creatorAvatarUrl={creator.avatar_url} creatorId={creator.id} rank={creator.rank} totalCreators={totalCreators} username={user?.email?.split("@")[0]} totalVotes={fanRanking.find(f => f.nickname === user?.email?.split("@")[0])?.votes || 0} totalPosts={fanRanking.find(f => f.nickname === user?.email?.split("@")[0])?.posts || 0} totalComments={fanRanking.find(f => f.nickname === user?.email?.split("@")[0])?.comments || 0} onClose={() => setShowFanCert(false)} />
        )}
        {showClaimModal && creator && (
          <ClaimCreatorModal
            creatorId={creator.id}
            creatorName={creator.name}
            onClose={() => setShowClaimModal(false)}
            onClaimed={() => {
              setCreator(prev => prev ? { ...prev, user_id: user?.id, is_verified: true } : prev);
              toast.success("크리에이터 프로필이 인증되었습니다! ✅");
            }}
          />
        )}
        {showPromotionModal && creator && (
          <PromotionRequestModal
            open={showPromotionModal}
            onOpenChange={setShowPromotionModal}
            creatorId={creator.id}
            creatorName={creator.name}
          />
        )}
      </Suspense>
      <CelebrationEffect show={showCelebration} message={celebrationMsg} onComplete={() => setShowCelebration(false)} />
    </div>
  );
};

export default CreatorProfile;
