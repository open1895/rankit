import { useState, useEffect, useRef } from "react";
import RPChargeModal from "@/components/RPChargeModal";
import Footer from "@/components/Footer";
import FanLevelProgress from "@/components/FanLevelProgress";
import { getEarnedBadges, getAllBadges } from "@/lib/fanBadges";
import CreatorDashboard from "@/components/CreatorDashboard";
import CreatorRecommendations from "@/components/CreatorRecommendations";
import MyDonationHistory from "@/components/MyDonationHistory";
import MyFanclubsSection from "@/components/MyFanclubsSection";
import SeasonBadgeShop from "@/components/SeasonBadgeShop";
import MyBadgesShowcase from "@/components/MyBadgesShowcase";
import GiftRPModal from "@/components/GiftRPModal";
import NotificationSettings from "@/components/NotificationSettings";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTickets } from "@/hooks/useTickets";
import { useLoginStreak } from "@/hooks/useLoginStreak";

import SEOHead from "@/components/SEOHead";
import EarlyAdopterBadge from "@/components/EarlyAdopterBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Crown,
  User,
  Heart,
  Edit3,
  Save,
  X,
  Calendar,
  LogOut,
  Camera,
  ExternalLink,
  Check,
  ChevronDown,
  Search,
  Link2,
  Coins,
  ShoppingBag,
  Play,
  Wallet,
  TrendingUp,
  Banknote,
  UserX,
  ShieldCheck,
  Ticket,
  Zap,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface Profile {
  display_name: string;
  avatar_url: string;
  is_beta_tester?: boolean;
}

interface VoteRecord {
  id: string;
  creator_id: string;
  created_at: string;
  creator_name?: string;
  creator_avatar?: string;
  creator_category?: string;
}

interface CreatorRecord {
  id: string;
  name: string;
  channel_link: string;
  category: string;
  subscriber_count: number;
  avatar_url: string;
}

const CATEGORIES = [
  { value: "게임", emoji: "🎮" },
  { value: "먹방", emoji: "🍽️" },
  { value: "뷰티", emoji: "💄" },
  { value: "음악", emoji: "🎵" },
  { value: "운동", emoji: "💪" },
  { value: "여행", emoji: "✈️" },
  { value: "테크", emoji: "💻" },
  { value: "교육", emoji: "📚" },
  { value: "댄스", emoji: "💃" },
  { value: "아트", emoji: "🎨" },
];

const MyPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { tickets } = useTickets();
  const { streak, claimedToday, claimStreak } = useLoginStreak();
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Creator edit state
  const [myCreator, setMyCreator] = useState<CreatorRecord | null>(null);
  const [editingCreator, setEditingCreator] = useState(false);
  const [creatorName, setCreatorName] = useState("");
  const [creatorLink, setCreatorLink] = useState("");
  const [creatorCategory, setCreatorCategory] = useState("");
  const [creatorSubscribers, setCreatorSubscribers] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [savingCreator, setSavingCreator] = useState(false);
  const creatorAvatarRef = useRef<HTMLInputElement>(null);
  const [uploadingCreatorAvatar, setUploadingCreatorAvatar] = useState(false);

  // Claim creator state
  const [showClaimSearch, setShowClaimSearch] = useState(false);
  const [claimSearchQuery, setClaimSearchQuery] = useState("");
  const [claimResults, setClaimResults] = useState<{ id: string; name: string; category: string; avatar_url: string }[]>([]);
  const [claimSearching, setClaimSearching] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Points & earnings
  const [pointBalance, setPointBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [creatorEarnings, setCreatorEarnings] = useState<{ total_earnings: number; settled_amount: number; pending_amount: number } | null>(null);
  const [watchingAd, setWatchingAd] = useState(false);
  const [requestingSettlement, setRequestingSettlement] = useState(false);
  const [bankInfo, setBankInfo] = useState("");
  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [showRPCharge, setShowRPCharge] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [convertCount, setConvertCount] = useState(1);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    // Check admin role
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => { if (data) setIsAdminUser(true); });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [profileRes, votesRes, creatorRes, pointsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, avatar_url, is_beta_tester")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("votes")
          .select("id, creator_id, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        (supabase as any)
          .from("creators")
          .select("id, name, channel_link, category, subscriber_count, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_points")
          .select("balance, total_earned")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setEditName(profileRes.data.display_name);
      }

      if (pointsRes.data) {
        setPointBalance(pointsRes.data.balance);
        setTotalEarned(pointsRes.data.total_earned);
      }

      if (creatorRes.data) {
        const c = creatorRes.data as any as CreatorRecord;
        setMyCreator(c);
        setCreatorName(c.name);
        setCreatorLink(c.channel_link);
        setCreatorCategory(c.category);
        setCreatorSubscribers(String(c.subscriber_count || ""));

        // Fetch creator earnings
        const { data: earningsData } = await (supabase as any)
          .from("creator_earnings")
          .select("total_earnings, settled_amount, pending_amount")
          .eq("creator_id", c.id)
          .maybeSingle();
        if (earningsData) setCreatorEarnings(earningsData);
      }

      if (votesRes.data && votesRes.data.length > 0) {
        const creatorIds = [...new Set(votesRes.data.map((v) => v.creator_id))];
        const { data: creators } = await supabase
          .from("creators")
          .select("id, name, avatar_url, category")
          .in("id", creatorIds);

        const creatorMap = new Map(
          (creators || []).map((c) => [c.id, c])
        );

        setVotes(
          votesRes.data.map((v) => ({
            ...v,
            creator_name: creatorMap.get(v.creator_id)?.name || "알 수 없음",
            creator_avatar: creatorMap.get(v.creator_id)?.avatar_url || "",
            creator_category: creatorMap.get(v.creator_id)?.category || "",
          }))
        );
      }

      // Fetch ticket history
      const { data: ticketData } = await supabase.functions.invoke("tickets", {
        body: { action: "get_history" },
      });
      if (ticketData?.transactions) {
        setTicketHistory(ticketData.transactions.slice(0, 5));
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user || !editName.trim()) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: editName.trim() })
      .eq("user_id", user.id);

    if (error) {
      toast.error("프로필 수정에 실패했습니다.");
    } else {
      setProfile((prev) => prev ? { ...prev, display_name: editName.trim() } : prev);
      setEditing(false);
      toast.success("프로필이 수정되었습니다! ✨");
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (!confirm("정말로 탈퇴하시겠습니까?\n\n모든 데이터(투표 기록, 크리에이터 프로필, 포인트 등)가 영구 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.")) return;
    if (!confirm("마지막 확인: 탈퇴를 진행하시겠습니까?")) return;
    setDeletingAccount(true);
    const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });
    if (error || data?.error) {
      toast.error(data?.error || "탈퇴에 실패했습니다. 다시 시도해주세요.");
      setDeletingAccount(false);
      return;
    }
    await signOut();
    toast.success("탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.");
    navigate("/");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("파일 크기는 2MB 이하여야 합니다.");
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("업로드에 실패했습니다.");
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("user_id", user.id);

    if (updateError) {
      toast.error("프로필 업데이트에 실패했습니다.");
    } else {
      setProfile((prev) => prev ? { ...prev, avatar_url: avatarUrl } : prev);
      toast.success("아바타가 변경되었습니다! 🎉");
    }
    setUploadingAvatar(false);
  };

  const handleSaveCreator = async () => {
    if (!user || !myCreator) return;
    if (!creatorName.trim() || !creatorLink.trim() || !creatorCategory) {
      toast.error("필수 항목을 모두 입력해주세요.");
      return;
    }
    setSavingCreator(true);

    const { error } = await supabase
      .from("creators")
      .update({
        name: creatorName.trim(),
        channel_link: creatorLink.trim(),
        category: creatorCategory,
        subscriber_count: parseInt(creatorSubscribers) || 0,
      } as any)
      .eq("id", myCreator.id);

    if (error) {
      toast.error("크리에이터 프로필 수정에 실패했습니다.");
    } else {
      setMyCreator((prev) =>
        prev
          ? {
              ...prev,
              name: creatorName.trim(),
              channel_link: creatorLink.trim(),
              category: creatorCategory,
              subscriber_count: parseInt(creatorSubscribers) || 0,
            }
          : prev
      );
      setEditingCreator(false);
      toast.success("크리에이터 프로필이 수정되었습니다! ✨");
    }
    setSavingCreator(false);
  };

  const handleCreatorAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !myCreator) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("파일 크기는 2MB 이하여야 합니다.");
      return;
    }

    setUploadingCreatorAvatar(true);
    const ext = file.name.split(".").pop();
    const fileName = `creator-${myCreator.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast.error("업로드에 실패했습니다.");
      setUploadingCreatorAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("creators")
      .update({ avatar_url: avatarUrl } as any)
      .eq("id", myCreator.id);

    if (updateError) {
      toast.error("아바타 업데이트에 실패했습니다.");
    } else {
      setMyCreator((prev) => prev ? { ...prev, avatar_url: avatarUrl } : prev);
      toast.success("크리에이터 아바타가 변경되었습니다! 🎉");
    }
    setUploadingCreatorAvatar(false);
  };

  const handleClaimSearch = async () => {
    const q = claimSearchQuery.trim();
    if (q.length < 2) {
      toast.error("2글자 이상 입력해주세요.");
      return;
    }
    setClaimSearching(true);
    const { data } = await supabase
      .from("creators")
      .select("id, name, category, avatar_url")
      .ilike("name", `%${q}%`)
      .limit(10);

    // Filter to only unclaimed creators (user_id is null) - we can't filter by user_id in query since it's not in types yet
    setClaimResults(data || []);
    setClaimSearching(false);
  };

  const handleClaimCreator = async (creatorId: string) => {
    if (!user) return;
    setClaiming(true);

    const { data, error } = await supabase.functions.invoke("claim-creator", {
      body: { action: "link_creator", creator_id: creatorId },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "연동에 실패했습니다.");
    } else {
      toast.success(data?.message || "크리에이터가 연동되었습니다! 🎉");
      setShowClaimSearch(false);
      setClaimSearchQuery("");
      setClaimResults([]);
      // Refetch creator data
      const { data: creatorData } = await (supabase as any)
        .from("creators")
        .select("id, name, channel_link, category, subscriber_count, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (creatorData) {
        setMyCreator(creatorData);
        setCreatorName(creatorData.name);
        setCreatorLink(creatorData.channel_link);
        setCreatorCategory(creatorData.category);
        setCreatorSubscribers(String(creatorData.subscriber_count || ""));
      }
    }
    setClaiming(false);
  };

  const handleWatchAd = async () => {
    if (!user || watchingAd) return;
    setWatchingAd(true);
    await new Promise((r) => setTimeout(r, 3000));
    const { data, error } = await supabase.functions.invoke("points", {
      body: { action: "earn_ad_reward" },
    });
    if (error || data?.error) {
      toast.error(data?.error || "보상 지급에 실패했습니다.");
    } else {
      setPointBalance(data.balance);
      setTotalEarned((prev) => prev + data.earned);
      toast.success(`🎉 +${data.earned} RP 획득!`);
    }
    setWatchingAd(false);
  };

  const handleSettlement = async () => {
    if (!user || !myCreator || !creatorEarnings || requestingSettlement) return;
    if (!bankInfo.trim()) {
      toast.error("은행 정보를 입력해주세요.");
      return;
    }
    setRequestingSettlement(true);
    const { data, error } = await supabase.functions.invoke("points", {
      body: {
        action: "request_settlement",
        creator_id: myCreator.id,
        amount: creatorEarnings.pending_amount,
        bank_info: bankInfo.trim(),
      },
    });
    if (error || data?.error) {
      toast.error(data?.error || "정산 신청에 실패했습니다.");
    } else {
      toast.success("정산 신청이 접수되었습니다! 💰");
      setCreatorEarnings((prev) => prev ? { ...prev, pending_amount: 0 } : prev);
      setShowSettlementForm(false);
      setBankInfo("");
    }
    setRequestingSettlement(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">로딩 중...</div>
      </div>
    );
  }

  if (!user) return null;

  const votesByDate = votes.reduce<Record<string, VoteRecord[]>>((acc, v) => {
    const date = new Date(v.created_at).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(v);
    return acc;
  }, {});

  const selectedCategoryObj = CATEGORIES.find((c) => c.value === creatorCategory);

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead title="마이페이지" description="내 프로필, 투표 기록, 크리에이터 관리 등을 확인하세요." path="/mypage" noIndex />
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
            <span className="text-lg font-bold gradient-text">마이페이지</span>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="glass p-6 space-y-4 animate-fade-in-up">
          <div className="flex items-center gap-4">
            {/* Avatar with upload */}
            <div className="relative shrink-0">
              <div
                className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground shadow-lg shadow-primary/20 overflow-hidden cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : profile?.display_name ? (
                  profile.display_name.slice(0, 2)
                ) : (
                  <User className="w-7 h-7" />
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-full">
                    <div className="w-5 h-5 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-primary-foreground shadow-md"
              >
                <Camera className="w-3 h-3" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-9 glass-sm border-glass-border text-sm"
                    placeholder="닉네임"
                    maxLength={20}
                  />
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="shrink-0 w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditName(profile?.display_name || "");
                    }}
                    className="shrink-0 w-8 h-8 rounded-lg glass-sm flex items-center justify-center text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold truncate">
                    {profile?.display_name || "이름 없음"}
                  </h2>
                  {profile?.is_beta_tester && <EarlyAdopterBadge size="sm" />}
                  <button
                    onClick={() => setEditing(true)}
                    className="shrink-0 w-7 h-7 rounded-lg glass-sm flex items-center justify-center text-muted-foreground hover:text-neon-cyan transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-sm p-3 text-center space-y-1">
              <div className="text-xl font-bold text-neon-cyan neon-text-cyan">
                {votes.length}
              </div>
              <div className="text-[11px] text-muted-foreground">총 투표 수</div>
            </div>
            <div className="glass-sm p-3 text-center space-y-1">
              <div className="text-xl font-bold gradient-text neon-text-purple">
                {new Set(votes.map((v) => v.creator_id)).size}
              </div>
              <div className="text-[11px] text-muted-foreground">응원한 크리에이터</div>
            </div>
          </div>

          {/* Fan Level */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-neon-purple" />
              <span className="text-xs font-bold">팬 레벨</span>
            </div>
            <FanLevelProgress activity={{ votes: votes.length, posts: 0, comments: 0 }} />
          </div>

          {/* Fan Badges */}
          {(() => {
            const activity = { votes: votes.length, posts: 0, comments: 0 };
            const earned = getEarnedBadges(activity);
            // Add early_adopter badge if user is beta tester
            if (profile?.is_beta_tester && !earned.some(e => e.key === "early_adopter")) {
              earned.unshift({ key: "early_adopter", label: "얼리어답터", emoji: "✨", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" });
            }
            const all = getAllBadges();
            return (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-neon-purple" />
                  <span className="text-xs font-bold">팬 뱃지</span>
                  <span className="text-[10px] text-muted-foreground">{earned.length}/{all.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {all.map((badge) => {
                    const isEarned = earned.some((e) => e.key === badge.key);
                    return (
                      <div
                        key={badge.key}
                        className={`glass-sm p-3 rounded-xl flex items-center gap-2 transition-all ${
                          isEarned ? "border border-primary/30" : "opacity-40 grayscale"
                        }`}
                      >
                        <span className="text-lg">{badge.emoji}</span>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold truncate">{badge.label}</div>
                          <div className="text-[9px] text-muted-foreground">
                            {isEarned ? "✅ 획득!" : "🔒 미획득"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-neon-purple" />
              <span className="text-xs font-bold">내 티켓 🎫</span>
            </div>
            <div className="glass-sm p-4 text-center space-y-1 relative overflow-hidden">
              <div className="text-3xl font-black gradient-text neon-text-purple">
                {tickets.toLocaleString()}
              </div>
              <div className="text-[11px] text-muted-foreground">보유 티켓</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                불꽃투표(5장) · 익명글(2장) · 응원강조(3장)
              </div>
            </div>
            {ticketHistory.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-muted-foreground px-1">최근 사용 내역</div>
                {ticketHistory.map((tx: any) => (
                  <div key={tx.id} className="glass-sm px-3 py-2 flex items-center justify-between text-[11px]">
                    <span className="text-foreground">{tx.description || tx.type}</span>
                    <span className={tx.amount > 0 ? "text-green-400 font-bold" : "text-destructive font-bold"}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Button
              onClick={() => navigate("/recharge")}
              className="w-full min-h-[44px] bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-[0_0_16px_rgba(168,85,247,0.4)] gap-2"
            >
              <Zap className="w-4 h-4" />
              무료 충전소 바로가기
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-bold">내 RP</span>
              </div>
            </div>
            <div className="glass-sm p-4 text-center space-y-2 relative overflow-hidden">
              <div className="text-3xl font-black gradient-text neon-text-purple">
                {pointBalance.toLocaleString()} <span className="text-base font-bold text-muted-foreground">RP</span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                🗳️ 투표 +1RP · 🏆 토너먼트 +2RP · 🎯 예측 +5~10RP
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="glass-sm p-2 text-center">
                  <div className="text-sm font-bold" style={{ color: "hsl(var(--neon-cyan))" }}>{totalEarned.toLocaleString()}</div>
                  <div className="text-[9px] text-muted-foreground">총 획득</div>
                </div>
                <div className="glass-sm p-2 text-center">
                  <div className="text-sm font-bold" style={{ color: "hsl(var(--neon-purple))" }}>{(totalEarned - pointBalance).toLocaleString()}</div>
                  <div className="text-[9px] text-muted-foreground">총 사용</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setShowRPCharge(true)}
                className="min-h-[44px] bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-bold rounded-xl shadow-[0_0_16px_rgba(168,85,247,0.3)] gap-1.5"
              >
                <Zap className="w-4 h-4" />
                ⚡ RP 충전
              </Button>
            </div>
            {/* Ad reward button */}
            <button
              onClick={handleWatchAd}
              disabled={watchingAd}
              className="w-full glass-sm glass-hover p-3 flex items-center gap-3 text-left"
            >
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <Play className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold">광고 시청하고 +50 RP 얻기</div>
                <div className="text-[10px] text-muted-foreground">하루 최대 5회</div>
              </div>
              {watchingAd && (
                <div className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
              )}
            </button>

            {/* Daily Login Streak */}
            <button
              onClick={async () => {
                if (claimedToday) return;
                const result = await claimStreak();
                if (result) setPointBalance(result.balance);
              }}
              disabled={claimedToday}
              className={`w-full glass-sm glass-hover p-3 flex items-center gap-3 text-left ${claimedToday ? "opacity-60" : ""}`}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold">
                  {claimedToday ? `✅ 출석 완료! (${streak}일차)` : "📅 오늘의 출석 체크"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {claimedToday
                    ? "내일 다시 출석하면 스트릭이 이어집니다"
                    : `연속 ${streak + 1}일차 · 스트릭 보너스 RP 획득`}
                </div>
              </div>
              {streak >= 3 && (
                <span className="text-xs font-bold" style={{ color: "hsl(var(--neon-cyan))" }}>
                  🔥 {streak}일
                </span>
              )}
            </button>

            {/* RP → Ticket Conversion */}
            <div className="glass-sm p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-primary" />
                  RP → 투표 티켓 전환
                </div>
                <span className="text-[10px] text-muted-foreground">10 RP = 1 티켓</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 flex-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => setConvertCount(Math.max(1, convertCount - 1))}
                    disabled={convertCount <= 1}
                  >-</Button>
                  <Input
                    type="number"
                    min={1}
                    max={Math.floor(pointBalance / 10)}
                    value={convertCount}
                    onChange={(e) => setConvertCount(Math.max(1, Math.min(Math.floor(pointBalance / 10) || 1, parseInt(e.target.value) || 1)))}
                    className="h-8 text-center text-sm font-bold w-16"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => setConvertCount(Math.min(Math.floor(pointBalance / 10) || 1, convertCount + 1))}
                    disabled={convertCount >= Math.floor(pointBalance / 10)}
                  >+</Button>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">장 ({convertCount * 10} RP)</span>
                </div>
                <Button
                  size="sm"
                  disabled={converting || pointBalance < convertCount * 10}
                  onClick={async () => {
                    setConverting(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("points", {
                        body: { action: "convert_to_ticket", amount: convertCount },
                      });
                      if (error) throw error;
                      if (data?.error) throw new Error(data.error);
                      setPointBalance(data.new_balance);
                      toast.success(`🎫 티켓 ${data.tickets_gained}장 전환 완료! (-${data.rp_spent} RP)`);
                      setConvertCount(1);
                    } catch (e: any) {
                      toast.error(e.message || "전환 실패");
                    } finally {
                      setConverting(false);
                    }
                  }}
                  className="h-8 text-xs font-bold whitespace-nowrap"
                >
                  {converting ? "..." : "전환"}
                </Button>
              </div>
            </div>
          </div>

          <RPChargeModal open={showRPCharge} onOpenChange={setShowRPCharge} />

          {/* AI Recommendations for user */}
          <CreatorRecommendations
            mode="user"
            userId={user?.id}
            title="🎯 맞춤 추천 크리에이터"
            subtitle="AI 추천"
          />


          {isAdminUser && (
            <Button
              onClick={() => navigate("/admin")}
              variant="outline"
              className="w-full glass-sm border-glass-border text-muted-foreground text-sm"
            >
              <ShieldCheck className="w-4 h-4 mr-2 text-primary" />
              관리자 페이지
            </Button>
          )}

          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full glass-sm border-glass-border hover:border-destructive/50 text-muted-foreground hover:text-destructive text-sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>

          <button
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            className="w-full text-xs text-muted-foreground/50 hover:text-destructive transition-colors py-1"
          >
            <UserX className="w-3 h-3 inline mr-1" />
            {deletingAccount ? "탈퇴 처리 중..." : "회원 탈퇴"}
          </button>
        </div>

        {/* Creator Dashboard */}
        {myCreator && (
          <CreatorDashboard creatorId={myCreator.id} creatorName={myCreator.name} />
        )}

        {/* Season Badges */}
        <MyBadgesShowcase />
        <SeasonBadgeShop />

        {/* RP Gift CTA */}
        <button
          onClick={() => setShowGiftModal(true)}
          className="w-full glass rounded-2xl p-4 flex items-center gap-3 hover:border-pink-400/40 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-primary flex items-center justify-center text-2xl shrink-0">
            🎁
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="font-bold text-sm">친구에게 RP 선물하기</div>
            <div className="text-[11px] text-muted-foreground">응원 메시지와 함께 보유 RP를 전송할 수 있어요</div>
          </div>
          <span className="text-xs text-pink-400 font-bold shrink-0">선물 →</span>
        </button>
        <GiftRPModal open={showGiftModal} onOpenChange={setShowGiftModal} />

        {/* My Donation History */}
        <MyDonationHistory />

        {/* Notification Settings */}
        <div className="glass p-6 space-y-3 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <span className="text-base">🔔</span>
            <h3 className="text-sm font-bold gradient-text">알림 설정</h3>
          </div>
          <NotificationSettings />
        </div>

        {/* Creator Profile Edit Section */}
        {myCreator && (
          <div className="glass p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-neon-purple" />
                <h3 className="text-sm font-bold gradient-text">내 크리에이터 프로필</h3>
              </div>
              {!editingCreator && (
                <button
                  onClick={() => setEditingCreator(true)}
                  className="flex items-center gap-1.5 text-xs text-neon-cyan hover:underline"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  수정
                </button>
              )}
            </div>

            {editingCreator ? (
              <div className="space-y-4">
                {/* Creator Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div
                      className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-lg font-bold text-primary-foreground overflow-hidden cursor-pointer"
                      onClick={() => creatorAvatarRef.current?.click()}
                    >
                      {myCreator.avatar_url ? (
                        <img src={myCreator.avatar_url} alt="creator" className="w-full h-full object-cover" />
                      ) : (
                        myCreator.name.slice(0, 2)
                      )}
                      {uploadingCreatorAvatar && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-full">
                          <div className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => creatorAvatarRef.current?.click()}
                      disabled={uploadingCreatorAvatar}
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-primary-foreground shadow-md"
                    >
                      <Camera className="w-2.5 h-2.5" />
                    </button>
                    <input
                      ref={creatorAvatarRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCreatorAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">프로필 사진 변경</span>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">채널 이름</label>
                  <Input
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    maxLength={50}
                    className="h-9 glass-sm border-glass-border text-sm"
                  />
                </div>

                {/* Link */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">채널 링크</label>
                  <Input
                    value={creatorLink}
                    onChange={(e) => setCreatorLink(e.target.value)}
                    maxLength={300}
                    className="h-9 glass-sm border-glass-border text-sm"
                  />
                </div>

                {/* Subscribers */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">구독자 수</label>
                  <Input
                    type="number"
                    value={creatorSubscribers}
                    onChange={(e) => setCreatorSubscribers(e.target.value)}
                    min={0}
                    className="h-9 glass-sm border-glass-border text-sm"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">카테고리</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl glass-sm border text-sm transition-colors ${
                        showCategoryDropdown ? "border-neon-purple/50" : "border-glass-border"
                      }`}
                    >
                      <span>
                        {selectedCategoryObj
                          ? `${selectedCategoryObj.emoji} ${selectedCategoryObj.value}`
                          : "카테고리 선택"}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`} />
                    </button>
                    {showCategoryDropdown && (
                      <div className="absolute z-50 mt-2 w-full rounded-xl bg-card border border-glass-border shadow-xl overflow-hidden">
                        <div className="max-h-48 overflow-y-auto">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => {
                                setCreatorCategory(cat.value);
                                setShowCategoryDropdown(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                creatorCategory === cat.value
                                  ? "bg-neon-purple/20 text-neon-purple"
                                  : "text-foreground hover:bg-card/80"
                              }`}
                            >
                              <span>{cat.emoji}</span>
                              <span className="flex-1 text-left">{cat.value}</span>
                              {creatorCategory === cat.value && <Check className="w-4 h-4 text-neon-purple" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveCreator}
                    disabled={savingCreator || !creatorName.trim() || !creatorLink.trim() || !creatorCategory}
                    className="flex-1 h-10 gradient-primary text-primary-foreground text-sm font-bold rounded-xl"
                  >
                    {savingCreator ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1.5" />
                        저장
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingCreator(false);
                      setCreatorName(myCreator.name);
                      setCreatorLink(myCreator.channel_link);
                      setCreatorCategory(myCreator.category);
                      setCreatorSubscribers(String(myCreator.subscriber_count || ""));
                      setShowCategoryDropdown(false);
                    }}
                    variant="outline"
                    className="h-10 px-4 glass-sm border-glass-border text-sm rounded-xl"
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground overflow-hidden shrink-0">
                    {myCreator.avatar_url ? (
                      <img src={myCreator.avatar_url} alt={myCreator.name} className="w-full h-full object-cover" />
                    ) : (
                      myCreator.name.slice(0, 2)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold truncate">{myCreator.name}</h4>
                    <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-neon-purple/15 text-neon-purple text-[10px] font-medium">
                      {CATEGORIES.find((c) => c.value === myCreator.category)?.emoji} {myCreator.category}
                    </span>
                  </div>
                </div>
                {myCreator.channel_link && (
                  <a
                    href={myCreator.channel_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-neon-cyan hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {myCreator.channel_link}
                  </a>
                )}
                <div className="text-xs text-muted-foreground">
                  구독자: {(myCreator.subscriber_count || 0).toLocaleString()}명
                </div>
              </div>
            )}
          </div>
        )}

        {/* Creator Earnings & Settlement */}
        {myCreator && (
          <div className="glass p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-neon-cyan" />
              <h3 className="text-sm font-bold gradient-text">크리에이터 수익</h3>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="glass-sm p-3 text-center space-y-1">
                <div className="text-sm font-bold" style={{ color: "hsl(var(--neon-cyan))" }}>
                  {((creatorEarnings?.total_earnings || 0)).toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground">총 수익(원)</div>
              </div>
              <div className="glass-sm p-3 text-center space-y-1">
                <div className="text-sm font-bold gradient-text">
                  {((creatorEarnings?.pending_amount || 0)).toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground">정산 가능</div>
              </div>
              <div className="glass-sm p-3 text-center space-y-1">
                <div className="text-sm font-bold text-muted-foreground">
                  {((creatorEarnings?.settled_amount || 0)).toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground">정산 완료</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              <span>투표 수 기반으로 수익이 산정됩니다</span>
            </div>

            {!showSettlementForm ? (
              <Button
                onClick={() => setShowSettlementForm(true)}
                disabled={!creatorEarnings || creatorEarnings.pending_amount < 10000}
                className={`w-full h-10 text-sm font-bold rounded-xl ${
                  creatorEarnings && creatorEarnings.pending_amount >= 10000
                    ? "gradient-primary text-primary-foreground"
                    : "glass-sm text-muted-foreground"
                }`}
              >
                <Banknote className="w-4 h-4 mr-2" />
                {creatorEarnings && creatorEarnings.pending_amount >= 10000
                  ? "정산 신청하기"
                  : "최소 10,000원 이상 시 정산 가능"}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">은행 정보 (은행명 + 계좌번호 + 예금주)</label>
                  <Input
                    value={bankInfo}
                    onChange={(e) => setBankInfo(e.target.value)}
                    placeholder="예: 카카오뱅크 3333-12-1234567 홍길동"
                    className="h-9 glass-sm border-glass-border text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSettlement}
                    disabled={requestingSettlement || !bankInfo.trim()}
                    className="flex-1 h-10 gradient-primary text-primary-foreground text-sm font-bold rounded-xl"
                  >
                    {requestingSettlement ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Banknote className="w-4 h-4 mr-1.5" />
                        {(creatorEarnings?.pending_amount || 0).toLocaleString()}원 정산 신청
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => { setShowSettlementForm(false); setBankInfo(""); }}
                    variant="outline"
                    className="h-10 px-4 glass-sm border-glass-border text-sm rounded-xl"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {!myCreator && (
          <div className="glass p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-neon-cyan" />
              <h3 className="text-sm font-bold gradient-text">크리에이터 연동</h3>
            </div>

            {!showClaimSearch ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  이미 등록된 크리에이터 프로필이 있나요? 본인 계정에 연동하여 프로필을 관리하세요.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setShowClaimSearch(true)}
                    variant="outline"
                    className="glass-sm border-glass-border hover:border-neon-cyan/50 text-sm w-full"
                  >
                    <Search className="w-4 h-4 mr-1.5 shrink-0" />
                    <span className="truncate">기존 크리에이터 찾기</span>
                  </Button>
                  <Button
                    onClick={() => navigate("/onboarding")}
                    className="gradient-primary text-primary-foreground text-sm w-full"
                  >
                    <Crown className="w-4 h-4 mr-1.5 shrink-0" />
                    <span className="truncate">새로 등록하기</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={claimSearchQuery}
                    onChange={(e) => setClaimSearchQuery(e.target.value)}
                    placeholder="크리에이터 이름 검색..."
                    className="h-9 glass-sm border-glass-border text-sm flex-1"
                    maxLength={50}
                    onKeyDown={(e) => e.key === "Enter" && handleClaimSearch()}
                  />
                  <Button
                    onClick={handleClaimSearch}
                    disabled={claimSearching}
                    size="sm"
                    className="h-9 gradient-primary text-primary-foreground"
                  >
                    {claimSearching ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {claimResults.length > 0 && (
                  <div className="space-y-2">
                    {claimResults.map((c) => (
                      <div
                        key={c.id}
                        className="glass-sm p-3 flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0 overflow-hidden">
                          {c.avatar_url ? (
                            <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            c.name.slice(0, 2)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground">{c.category}</div>
                        </div>
                        <Button
                          onClick={() => handleClaimCreator(c.id)}
                          disabled={claiming}
                          size="sm"
                          className="h-8 text-xs gradient-primary text-primary-foreground shrink-0"
                        >
                          {claiming ? (
                            <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Link2 className="w-3 h-3 mr-1" />
                              연동
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {claimResults.length === 0 && claimSearchQuery && !claimSearching && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    검색 결과가 없습니다.
                  </p>
                )}

                <button
                  onClick={() => {
                    setShowClaimSearch(false);
                    setClaimSearchQuery("");
                    setClaimResults([]);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← 돌아가기
                </button>
              </div>
            )}
          </div>
        )}

        {/* Growth Journal - 성장 기록장 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-neon-purple" />
            <h3 className="text-sm font-bold gradient-text">성장 기록장</h3>
          </div>

          {/* Creator stats summary */}
          {votes.length > 0 && (() => {
            const creatorVoteCounts = votes.reduce<Record<string, { name: string; avatar: string; category: string; count: number }>>((acc, v) => {
              if (!acc[v.creator_id]) {
                acc[v.creator_id] = { name: v.creator_name || "알 수 없음", avatar: v.creator_avatar || "", category: v.creator_category || "", count: 0 };
              }
              acc[v.creator_id].count++;
              return acc;
            }, {});
            const sorted = Object.entries(creatorVoteCounts).sort((a, b) => b[1].count - a[1].count);
            const topCreator = sorted[0];
            return (
              <div className="glass p-4 space-y-3">
                <div className="text-xs text-muted-foreground">내가 가장 많이 응원한 크리에이터</div>
                {topCreator && (
                  <button
                    onClick={() => navigate(`/creator/${topCreator[0]}`)}
                    className="w-full glass-sm glass-hover p-3 flex items-center gap-3 text-left"
                  >
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0 overflow-hidden">
                      {topCreator[1].avatar ? (
                        <img src={topCreator[1].avatar} alt={topCreator[1].name} className="w-full h-full object-cover" />
                      ) : (
                        topCreator[1].name.slice(0, 2)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{topCreator[1].name}</div>
                      <div className="text-[10px] text-muted-foreground">{topCreator[1].category}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-lg font-bold text-neon-purple">{topCreator[1].count}</div>
                      <div className="text-[10px] text-muted-foreground">투표</div>
                    </div>
                  </button>
                )}
                {/* All supported creators */}
                <div className="text-xs text-muted-foreground mt-2">응원 크리에이터 ({sorted.length}명)</div>
                <div className="grid grid-cols-3 gap-2">
                  {sorted.slice(0, 6).map(([cid, info]) => (
                    <button
                      key={cid}
                      onClick={() => navigate(`/creator/${cid}`)}
                      className="glass-sm p-2 text-center space-y-1 hover:border-neon-purple/30 transition-all"
                    >
                      <div className="w-8 h-8 mx-auto rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground overflow-hidden">
                        {info.avatar ? (
                          <img src={info.avatar} alt={info.name} className="w-full h-full object-cover" />
                        ) : (
                          info.name.slice(0, 2)
                        )}
                      </div>
                      <div className="text-[10px] font-medium truncate">{info.name}</div>
                      <div className="text-[10px] text-neon-cyan font-bold">{info.count}표</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Vote timeline */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neon-cyan" />
            <h4 className="text-xs font-bold text-muted-foreground">투표 타임라인</h4>
          </div>

          {votes.length === 0 ? (
            <div className="glass p-8 text-center text-sm text-muted-foreground rounded-2xl">
              아직 투표 기록이 없습니다.
              <br />
              <button
                onClick={() => navigate("/")}
                className="mt-3 text-neon-cyan hover:underline"
              >
                투표하러 가기 →
              </button>
            </div>
          ) : (
            Object.entries(votesByDate).map(([date, records]) => (
              <div key={date} className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {date}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--neon-purple)/0.15)] text-[hsl(var(--neon-purple))] font-medium">{records.length}표</span>
                </div>
                {records.map((vote) => (
                  <button
                    key={vote.id}
                    onClick={() => navigate(`/creator/${vote.creator_id}`)}
                    className="w-full glass-sm glass-hover p-3 flex items-center gap-3 text-left"
                  >
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                      {vote.creator_name?.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {vote.creator_name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {vote.creator_category}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(vote.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyPage;
