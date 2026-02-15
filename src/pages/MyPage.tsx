import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";
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
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface Profile {
  display_name: string;
  avatar_url: string;
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
  { value: "먹방/요리", emoji: "🍽️" },
  { value: "뷰티/패션", emoji: "💄" },
  { value: "음악/커버", emoji: "🎵" },
  { value: "fitness/운동", emoji: "💪" },
  { value: "여행/브이로그", emoji: "✈️" },
  { value: "테크/코딩", emoji: "💻" },
  { value: "교육/독서", emoji: "📚" },
  { value: "댄스/퍼포먼스", emoji: "💃" },
  { value: "아트/일러스트", emoji: "🎨" },
];

const MyPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [profileRes, votesRes, creatorRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, avatar_url")
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
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setEditName(profileRes.data.display_name);
      }

      if (creatorRes.data) {
        const c = creatorRes.data as any as CreatorRecord;
        setMyCreator(c);
        setCreatorName(c.name);
        setCreatorLink(c.channel_link);
        setCreatorCategory(c.category);
        setCreatorSubscribers(String(c.subscriber_count || ""));
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
      body: { creator_id: creatorId },
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
          <ThemeToggle />
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

          {/* Sign Out */}
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full glass-sm border-glass-border hover:border-destructive/50 text-muted-foreground hover:text-destructive text-sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
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

        {/* Claim Creator Section - shown when no linked creator */}
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
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowClaimSearch(true)}
                    variant="outline"
                    className="flex-1 glass-sm border-glass-border hover:border-neon-cyan/50 text-sm"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    기존 크리에이터 찾기
                  </Button>
                  <Button
                    onClick={() => navigate("/onboarding")}
                    className="flex-1 gradient-primary text-primary-foreground text-sm"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    새로 등록하기
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

        {/* Vote History */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-neon-purple" />
            <h3 className="text-sm font-bold gradient-text">투표 기록</h3>
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
    </div>
  );
};

export default MyPage;
