import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, Users, Crown, Trash2, ShieldCheck, ShieldOff,
  Search, Edit3, Save, X, RefreshCw, Image
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import SEOHead from "@/components/SEOHead";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  display_name: string;
  avatar_url: string;
  role: string;
}

interface AdminCreator {
  id: string;
  name: string;
  category: string;
  avatar_url: string;
  rank: number;
  votes_count: number;
  rankit_score: number;
  channel_link: string;
  subscriber_count: number;
  youtube_subscribers: number;
  instagram_followers: number;
  tiktok_followers: number;
  is_verified: boolean;
  user_id: string | null;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"users" | "creators">("users");

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Creators
  const [creators, setCreators] = useState<AdminCreator[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);
  const [creatorSearch, setCreatorSearch] = useState("");
  const [editingCreator, setEditingCreator] = useState<AdminCreator | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminCreator>>({});
  const [savingCreator, setSavingCreator] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }

    // Check admin role
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => {
        if (!data) {
          toast.error("관리자 권한이 없습니다.");
          navigate("/");
          return;
        }
        setIsAdmin(true);
      });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "users") loadUsers();
    if (tab === "creators") loadCreators();
  }, [isAdmin, tab]);

  const loadUsers = async () => {
    setUsersLoading(true);
    const { data, error } = await supabase.functions.invoke("admin", {
      body: { action: "list_users" },
    });
    if (error || data?.error) toast.error(data?.error || "불러오기 실패");
    else setUsers(data.users || []);
    setUsersLoading(false);
  };

  const loadCreators = async () => {
    setCreatorsLoading(true);
    const { data, error } = await supabase.functions.invoke("admin", {
      body: { action: "list_creators" },
    });
    if (error || data?.error) toast.error(data?.error || "불러오기 실패");
    else setCreators(data.creators || []);
    setCreatorsLoading(false);
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`"${email}" 회원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    const { data, error } = await supabase.functions.invoke("admin", {
      body: { action: "delete_user", user_id: userId },
    });
    if (error || data?.error) toast.error(data?.error || "삭제 실패");
    else { toast.success("회원이 삭제되었습니다."); setUsers(prev => prev.filter(u => u.id !== userId)); }
  };

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    const isAdmin = currentRole === "admin";
    if (!confirm(isAdmin ? "관리자 권한을 해제하시겠습니까?" : "관리자 권한을 부여하시겠습니까?")) return;
    const { data, error } = await supabase.functions.invoke("admin", {
      body: { action: "set_admin", user_id: userId, is_admin: !isAdmin },
    });
    if (error || data?.error) toast.error(data?.error || "권한 변경 실패");
    else {
      toast.success(isAdmin ? "관리자 권한 해제" : "관리자 권한 부여");
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: isAdmin ? "user" : "admin" } : u));
    }
  };

  const handleDeleteCreator = async (creatorId: string, name: string) => {
    if (!confirm(`"${name}" 크리에이터를 삭제하시겠습니까?`)) return;
    const { data, error } = await supabase.functions.invoke("admin", {
      body: { action: "delete_creator", creator_id: creatorId },
    });
    if (error || data?.error) toast.error(data?.error || "삭제 실패");
    else { toast.success("크리에이터가 삭제되었습니다."); setCreators(prev => prev.filter(c => c.id !== creatorId)); }
  };

  const handleEditCreator = (creator: AdminCreator) => {
    setEditingCreator(creator);
    setEditForm({
      name: creator.name,
      category: creator.category,
      channel_link: creator.channel_link,
      subscriber_count: creator.subscriber_count,
      youtube_subscribers: creator.youtube_subscribers,
      instagram_followers: creator.instagram_followers,
      tiktok_followers: creator.tiktok_followers,
      is_verified: creator.is_verified,
      avatar_url: creator.avatar_url,
    });
  };

  const handleSaveCreator = async () => {
    if (!editingCreator) return;
    setSavingCreator(true);
    const { data, error } = await supabase.functions.invoke("admin", {
      body: { action: "update_creator", creator_id: editingCreator.id, ...editForm },
    });
    if (error || data?.error) toast.error(data?.error || "저장 실패");
    else {
      toast.success("크리에이터 정보가 수정되었습니다.");
      setCreators(prev => prev.map(c => c.id === editingCreator.id ? { ...c, ...editForm } as AdminCreator : c));
      setEditingCreator(null);
    }
    setSavingCreator(false);
  };

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredCreators = creators.filter(c =>
    c.name?.toLowerCase().includes(creatorSearch.toLowerCase()) ||
    c.category?.toLowerCase().includes(creatorSearch.toLowerCase())
  );

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead title="관리자" description="관리자 페이지" path="/admin" noIndex />

      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="text-lg font-bold gradient-text">관리자 페이지</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "users" ? "gradient-primary text-primary-foreground" : "glass-sm text-muted-foreground hover:text-foreground"}`}
          >
            <Users className="w-4 h-4" />
            회원 관리 ({users.length})
          </button>
          <button
            onClick={() => setTab("creators")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "creators" ? "gradient-primary text-primary-foreground" : "glass-sm text-muted-foreground hover:text-foreground"}`}
          >
            <Crown className="w-4 h-4" />
            크리에이터 관리 ({creators.length})
          </button>
        </div>

        {/* ─── USERS TAB ─────────────────────────────── */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="이메일 또는 닉네임 검색..."
                  className="pl-9 glass-sm border-glass-border"
                />
              </div>
              <Button onClick={loadUsers} variant="outline" size="icon" className="glass-sm border-glass-border shrink-0">
                <RefreshCw className={`w-4 h-4 ${usersLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {usersLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">불러오는 중...</div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map(u => (
                  <div key={u.id} className="glass p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0 overflow-hidden">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (u.display_name || u.email || "?").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{u.display_name || "(이름 없음)"}</span>
                        {u.role === "admin" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">관리자</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      <p className="text-[10px] text-muted-foreground">
                        가입: {new Date(u.created_at).toLocaleDateString("ko-KR")}
                        {u.last_sign_in_at && ` · 최근 로그인: ${new Date(u.last_sign_in_at).toLocaleDateString("ko-KR")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleAdmin(u.id, u.role)}
                        title={u.role === "admin" ? "관리자 해제" : "관리자 지정"}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${u.role === "admin" ? "bg-primary/20 text-primary hover:bg-destructive/20 hover:text-destructive" : "glass-sm text-muted-foreground hover:text-primary"}`}
                      >
                        {u.role === "admin" ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                      </button>
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="w-8 h-8 rounded-lg glass-sm flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">검색 결과가 없습니다.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── CREATORS TAB ──────────────────────────── */}
        {tab === "creators" && (
          <div className="space-y-4">
            {/* Edit modal */}
            {editingCreator && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                <div className="glass p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-foreground">크리에이터 수정</h3>
                    <button onClick={() => setEditingCreator(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">채널 이름</label>
                      <Input value={editForm.name || ""} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="mt-1 glass-sm border-glass-border" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">카테고리</label>
                      <Input value={editForm.category || ""} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} className="mt-1 glass-sm border-glass-border" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">채널 링크</label>
                      <Input value={editForm.channel_link || ""} onChange={e => setEditForm(p => ({ ...p, channel_link: e.target.value }))} className="mt-1 glass-sm border-glass-border" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">아바타 URL</label>
                      <Input value={editForm.avatar_url || ""} onChange={e => setEditForm(p => ({ ...p, avatar_url: e.target.value }))} className="mt-1 glass-sm border-glass-border" placeholder="https://..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">구독자 수</label>
                        <Input type="number" value={editForm.subscriber_count || 0} onChange={e => setEditForm(p => ({ ...p, subscriber_count: +e.target.value }))} className="mt-1 glass-sm border-glass-border" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">YouTube 구독자</label>
                        <Input type="number" value={editForm.youtube_subscribers || 0} onChange={e => setEditForm(p => ({ ...p, youtube_subscribers: +e.target.value }))} className="mt-1 glass-sm border-glass-border" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">인스타 팔로워</label>
                        <Input type="number" value={editForm.instagram_followers || 0} onChange={e => setEditForm(p => ({ ...p, instagram_followers: +e.target.value }))} className="mt-1 glass-sm border-glass-border" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">틱톡 팔로워</label>
                        <Input type="number" value={editForm.tiktok_followers || 0} onChange={e => setEditForm(p => ({ ...p, tiktok_followers: +e.target.value }))} className="mt-1 glass-sm border-glass-border" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="verified" checked={editForm.is_verified || false} onChange={e => setEditForm(p => ({ ...p, is_verified: e.target.checked }))} className="w-4 h-4" />
                      <label htmlFor="verified" className="text-sm text-foreground">인증 크리에이터</label>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => setEditingCreator(null)} variant="outline" className="flex-1 glass-sm border-glass-border">취소</Button>
                    <Button onClick={handleSaveCreator} disabled={savingCreator} className="flex-1 gradient-primary text-primary-foreground">
                      {savingCreator ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <><Save className="w-4 h-4 mr-1" />저장</>}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={creatorSearch}
                  onChange={e => setCreatorSearch(e.target.value)}
                  placeholder="크리에이터 이름 또는 카테고리 검색..."
                  className="pl-9 glass-sm border-glass-border"
                />
              </div>
              <Button onClick={loadCreators} variant="outline" size="icon" className="glass-sm border-glass-border shrink-0">
                <RefreshCw className={`w-4 h-4 ${creatorsLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {creatorsLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">불러오는 중...</div>
            ) : (
              <div className="space-y-2">
                {filteredCreators.map(c => (
                  <div key={c.id} className="glass p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0 overflow-hidden">
                      {c.avatar_url?.startsWith("http") ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" /> : c.name?.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{c.rank}위</span>
                        <span className="text-sm font-semibold truncate">{c.name}</span>
                        {c.is_verified && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary font-medium">인증</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{c.category} · {c.votes_count.toLocaleString()}표</p>
                      <p className="text-[10px] text-muted-foreground">YT: {c.youtube_subscribers.toLocaleString()} · IG: {c.instagram_followers.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEditCreator(c)}
                        className="w-8 h-8 rounded-lg glass-sm flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCreator(c.id, c.name)}
                        className="w-8 h-8 rounded-lg glass-sm flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredCreators.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">검색 결과가 없습니다.</div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
