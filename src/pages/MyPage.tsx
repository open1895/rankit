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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [profileRes, votesRes] = await Promise.all([
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
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setEditName(profileRes.data.display_name);
      }

      if (votesRes.data && votesRes.data.length > 0) {
        // Fetch creator info for vote records
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">로딩 중...</div>
      </div>
    );
  }

  if (!user) return null;

  // Group votes by date
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
