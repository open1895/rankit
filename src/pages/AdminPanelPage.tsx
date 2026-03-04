import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Loader2, Shield, ExternalLink, Lock, Pencil, Trash2, Users, UserCog, ShieldCheck, ShieldOff, UserX, Megaphone, Plus, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const CATEGORIES = ["게임", "먹방", "뷰티", "음악", "운동", "여행", "테크", "아트", "교육", "댄스"];

const AdminPanelPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [tab, setTab] = useState<"nominations" | "creators" | "users" | "board" | "predictions">("nominations");
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setCheckingRole(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
      setCheckingRole(false);
    };
    if (!authLoading) checkAdminRole();
  }, [user, authLoading]);

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-sm mx-auto p-6">
          <div className="glass rounded-xl border border-glass-border p-8 space-y-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">로그인 필요</h2>
              <p className="text-sm text-muted-foreground">관리자 패널에 접근하려면 로그인이 필요합니다.</p>
            </div>
            <Button onClick={() => navigate("/auth")} className="w-full">로그인</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-sm mx-auto p-6">
          <div className="glass rounded-xl border border-glass-border p-8 space-y-4 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground">접근 거부</h2>
              <p className="text-sm text-muted-foreground">관리자 권한이 없습니다.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 pb-0">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">관리자</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTab("nominations")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "nominations" ? "gradient-primary text-primary-foreground" : "glass-sm text-muted-foreground"}`}
          >
            후보 승인
          </button>
          <button
            onClick={() => setTab("creators")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "creators" ? "gradient-primary text-primary-foreground" : "glass-sm text-muted-foreground"}`}
          >
            <Users className="w-4 h-4 inline mr-1" />크리에이터
          </button>
          <button
            onClick={() => setTab("users")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "users" ? "gradient-primary text-primary-foreground" : "glass-sm text-muted-foreground"}`}
          >
            <UserCog className="w-4 h-4 inline mr-1" />회원
          </button>
          <button
            onClick={() => setTab("board")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "board" ? "gradient-primary text-primary-foreground" : "glass-sm text-muted-foreground"}`}
          >
            <Megaphone className="w-4 h-4 inline mr-1" />게시판
          </button>
          <button
            onClick={() => setTab("predictions")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "predictions" ? "gradient-primary text-primary-foreground" : "glass-sm text-muted-foreground"}`}
          >
            <Target className="w-4 h-4 inline mr-1" />예측
          </button>
        </div>

        {tab === "nominations" ? <NominationsTab /> : tab === "creators" ? <CreatorsTab /> : tab === "users" ? <UsersTab /> : tab === "board" ? <BoardTab /> : <PredictionsTab />}
      </div>
      <Footer />
    </div>
  );
};

/* ─── Nominations Tab ─── */
const NominationsTab = () => {
  const queryClient = useQueryClient();

  const { data: nominations, isLoading } = useQuery({
    queryKey: ["pending-nominations"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("admin", {
        body: { action: "list_nominations" },
      });
      return (data?.nominations || []).filter((n: any) => n.status === "pending");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("admin", { body: { action: "approve_nomination", nomination_id: id } });
      if (error) throw error; return data;
    },
    onSuccess: () => { toast.success("승인 완료!"); queryClient.invalidateQueries({ queryKey: ["pending-nominations"] }); },
    onError: (e: any) => toast.error(`승인 실패: ${e.message}`),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("admin", { body: { action: "reject_nomination", nomination_id: id } });
      if (error) throw error; return data;
    },
    onSuccess: () => { toast.success("반려 완료"); queryClient.invalidateQueries({ queryKey: ["pending-nominations"] }); },
    onError: (e: any) => toast.error(`반려 실패: ${e.message}`),
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!nominations?.length) return <div className="text-center py-16 text-muted-foreground text-sm">대기 중인 후보가 없습니다.</div>;

  return (
    <div className="space-y-3">
      <Badge variant="outline" className="text-xs">대기 {nominations.length}건</Badge>
      {nominations.map((nom: any) => (
        <div key={nom.id} className="glass rounded-xl border border-glass-border p-4 space-y-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{nom.creator_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">{nom.category || "-"}</Badge>
              <span className="text-xs text-muted-foreground">{new Date(nom.created_at).toLocaleDateString("ko-KR")}</span>
            </div>
          </div>
          <a href={nom.channel_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs truncate max-w-full">
            {nom.channel_url}<ExternalLink className="w-3 h-3 shrink-0" />
          </a>
          {nom.reason && <p className="text-xs text-muted-foreground line-clamp-2">{nom.reason}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => approveMutation.mutate(nom.id)} disabled={approveMutation.isPending || rejectMutation.isPending} className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9">
              {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} 승인
            </Button>
            <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(nom.id)} disabled={approveMutation.isPending || rejectMutation.isPending} className="flex-1 h-9">
              {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} 반려
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Creators Tab ─── */
const CreatorsTab = () => {
  const queryClient = useQueryClient();
  const [editCreator, setEditCreator] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [search, setSearch] = useState("");

  const { data: creators, isLoading } = useQuery({
    queryKey: ["admin-creators"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("admin", { body: { action: "list_creators" } });
      return data?.creators || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, category }: { id: string; name: string; category: string }) => {
      const { data, error } = await supabase.functions.invoke("admin", {
        body: { action: "update_creator", creator_id: id, name, category },
      });
      if (error) throw error; return data;
    },
    onSuccess: () => { toast.success("크리에이터 정보가 수정되었습니다."); setEditCreator(null); queryClient.invalidateQueries({ queryKey: ["admin-creators"] }); },
    onError: (e: any) => toast.error(`수정 실패: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("admin", {
        body: { action: "delete_creator", creator_id: id },
      });
      if (error) throw error; return data;
    },
    onSuccess: () => { toast.success("크리에이터가 삭제되었습니다."); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-creators"] }); },
    onError: (e: any) => toast.error(`삭제 실패: ${e.message}`),
  });

  const filtered = (creators || []).filter((c: any) =>
    !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input placeholder="크리에이터 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="text-sm" />
          <Badge variant="outline" className="text-xs whitespace-nowrap">{filtered.length}명</Badge>
        </div>

        {filtered.map((c: any) => (
          <div key={c.id} className="glass rounded-xl border border-glass-border p-3 flex items-center gap-3">
            <img src={c.avatar_url?.startsWith("http") ? c.avatar_url : c.avatar_url?.startsWith("/") ? c.avatar_url : "/placeholder.svg"} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 bg-muted" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px]">{c.category || "-"}</Badge>
                <span className="text-[10px] text-muted-foreground">#{c.rank}</span>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => { setEditCreator(c); setEditName(c.name); setEditCategory(c.category); }} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => setDeleteTarget(c)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editCreator} onOpenChange={(v) => !v && setEditCreator(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-base font-bold">크리에이터 수정</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">이름</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={50} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">카테고리</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setEditCategory(editCategory === cat ? "" : cat)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${editCategory === cat ? "gradient-primary text-primary-foreground" : "glass-sm text-muted-foreground hover:text-foreground"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={() => editCreator && updateMutation.mutate({ id: editCreator.id, name: editName.trim(), category: editCategory })}
              disabled={updateMutation.isPending || !editName.trim()} className="w-full">
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-base font-bold">크리에이터 삭제</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{deleteTarget?.name}</span>을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">취소</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="flex-1">
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/* ─── Users Tab ─── */
const UsersTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleTarget, setRoleTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("admin", { body: { action: "list_users" } });
      return data?.users || [];
    },
  });

  const setRoleMutation = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("admin", {
        body: { action: "set_role", user_id, role },
      });
      if (error) throw error; return data;
    },
    onSuccess: () => { toast.success("역할이 부여되었습니다."); setRoleTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(`실패: ${e.message}`),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("admin", {
        body: { action: "remove_role", user_id, role },
      });
      if (error) throw error; return data;
    },
    onSuccess: () => { toast.success("역할이 해제되었습니다."); setRoleTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(`실패: ${e.message}`),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (user_id: string) => {
      const { data, error } = await supabase.functions.invoke("admin", {
        body: { action: "delete_user", user_id },
      });
      if (error) throw error; return data;
    },
    onSuccess: () => { toast.success("회원이 삭제되었습니다."); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(`삭제 실패: ${e.message}`),
  });

  const filtered = (users || []).filter((u: any) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (u.display_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
  });

  const getRoleBadge = (role: string) => {
    if (role === "admin") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">관리자</Badge>;
    if (role === "moderator") return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">모더레이터</Badge>;
    return <Badge variant="outline" className="text-[10px] text-muted-foreground">일반</Badge>;
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input placeholder="이름 또는 이메일 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="text-sm" />
          <Badge variant="outline" className="text-xs whitespace-nowrap">{filtered.length}명</Badge>
        </div>

        {filtered.map((u: any) => (
          <div key={u.id} className="glass rounded-xl border border-glass-border p-3 flex items-center gap-3">
            <img src={u.avatar_url || "/placeholder.svg"} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 bg-muted" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{u.display_name || "이름 없음"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {getRoleBadge(u.role)}
                <span className="text-[10px] text-muted-foreground">
                  {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("ko-KR") : "미접속"}
                </span>
              </div>
            </div>
            <button onClick={() => setRoleTarget(u)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <ShieldCheck className="w-4 h-4" />
            </button>
            <button onClick={() => setDeleteTarget(u)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
              <UserX className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Role Dialog */}
      <Dialog open={!!roleTarget} onOpenChange={(v) => !v && setRoleTarget(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-base font-bold">역할 관리</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-3">
              <img src={roleTarget?.avatar_url || "/placeholder.svg"} alt="" className="w-10 h-10 rounded-full object-cover bg-muted" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{roleTarget?.display_name || "이름 없음"}</p>
                <p className="text-xs text-muted-foreground truncate">{roleTarget?.email}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">현재 역할: {getRoleBadge(roleTarget?.role || "user")}</p>
            <div className="space-y-2">
              {roleTarget?.role !== "admin" && (
                <Button onClick={() => roleTarget && setRoleMutation.mutate({ user_id: roleTarget.id, role: "admin" })}
                  disabled={setRoleMutation.isPending || removeRoleMutation.isPending} className="w-full bg-red-600 hover:bg-red-700 text-white">
                  {setRoleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ShieldCheck className="w-4 h-4 mr-1" />}
                  관리자 부여
                </Button>
              )}
              {roleTarget?.role !== "moderator" && (
                <Button onClick={() => roleTarget && setRoleMutation.mutate({ user_id: roleTarget.id, role: "moderator" })}
                  disabled={setRoleMutation.isPending || removeRoleMutation.isPending} variant="outline" className="w-full border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10">
                  {setRoleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ShieldCheck className="w-4 h-4 mr-1" />}
                  모더레이터 부여
                </Button>
              )}
              {roleTarget?.role !== "user" && (
                <Button onClick={() => roleTarget && removeRoleMutation.mutate({ user_id: roleTarget.id, role: roleTarget.role })}
                  disabled={setRoleMutation.isPending || removeRoleMutation.isPending} variant="destructive" className="w-full">
                  {removeRoleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ShieldOff className="w-4 h-4 mr-1" />}
                  역할 해제 (일반으로)
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-base font-bold">회원 삭제</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-3">
              <img src={deleteTarget?.avatar_url || "/placeholder.svg"} alt="" className="w-10 h-10 rounded-full object-cover bg-muted" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{deleteTarget?.display_name || "이름 없음"}</p>
                <p className="text-xs text-muted-foreground truncate">{deleteTarget?.email}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">이 회원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">취소</Button>
              <Button variant="destructive" onClick={() => deleteTarget && deleteUserMutation.mutate(deleteTarget.id)} disabled={deleteUserMutation.isPending} className="flex-1">
                {deleteUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserX className="w-4 h-4 mr-1" />}삭제
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/* ─── Board Tab ─── */
const BOARD_CATEGORIES = ["공지", "이벤트", "HOT"];

const BoardTab = () => {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPost, setEditPost] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("공지");
  const [author, setAuthor] = useState("Rankit 운영팀");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-board-posts"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("admin", {
        body: { action: "list_board_posts" },
      });
      return data?.posts || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("admin", {
        body: { action: "create_board_post", title, content, category, author },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("게시글이 등록되었습니다.");
      setCreateOpen(false);
      setTitle(""); setContent(""); setCategory("공지"); setAuthor("Rankit 운영팀");
      queryClient.invalidateQueries({ queryKey: ["admin-board-posts"] });
    },
    onError: (e: any) => toast.error(`등록 실패: ${e.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.functions.invoke("admin", {
        body: { action: "update_board_post", post_id: id, ...updates },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("수정 완료");
      setEditPost(null);
      queryClient.invalidateQueries({ queryKey: ["admin-board-posts"] });
    },
    onError: (e: any) => toast.error(`수정 실패: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke("admin", {
        body: { action: "delete_board_post", post_id: id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("삭제 완료");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-board-posts"] });
    },
    onError: (e: any) => toast.error(`삭제 실패: ${e.message}`),
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">{(posts || []).length}건</Badge>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />새 게시글
          </Button>
        </div>

        {(posts || []).map((post: any) => (
          <div key={post.id} className="glass rounded-xl border border-glass-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Badge className={`text-[10px] ${post.is_active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-muted text-muted-foreground"}`}>
                {post.is_active ? "활성" : "비활성"}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">{post.category}</Badge>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">{post.title}</p>
            <p className="text-xs text-muted-foreground truncate">{post.author} · {new Date(post.created_at).toLocaleDateString("ko-KR")}</p>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setEditPost(post);
                  setTitle(post.title);
                  setContent(post.content);
                  setCategory(post.category);
                  setAuthor(post.author);
                }}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateMutation.mutate({ id: post.id, updates: { is_active: !post.is_active } })}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-xs"
              >
                {post.is_active ? "비활성화" : "활성화"}
              </button>
              <button
                onClick={() => setDeleteTarget(post)}
                className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-base font-bold">새 게시글 작성</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">카테고리</label>
              <div className="flex gap-1.5">
                {BOARD_CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${category === cat ? "gradient-primary text-primary-foreground" : "glass-sm text-muted-foreground hover:text-foreground"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">제목</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="제목을 입력하세요" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">작성자</label>
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={50} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">내용</label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="내용을 입력하세요" />
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !title.trim()} className="w-full">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}등록
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editPost} onOpenChange={(v) => !v && setEditPost(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-base font-bold">게시글 수정</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">카테고리</label>
              <div className="flex gap-1.5">
                {BOARD_CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${category === cat ? "gradient-primary text-primary-foreground" : "glass-sm text-muted-foreground hover:text-foreground"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">제목</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">작성자</label>
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={50} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">내용</label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} />
            </div>
            <Button onClick={() => editPost && updateMutation.mutate({ id: editPost.id, updates: { title, content, category, author } })}
              disabled={updateMutation.isPending || !title.trim()} className="w-full">
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-base font-bold">게시글 삭제</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">"{deleteTarget?.title}"</span>을(를) 삭제하시겠습니까?
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">취소</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="flex-1">
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/* ─── Predictions Tab ─── */
const PredictionsTab = () => {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creatorAId, setCreatorAId] = useState("");
  const [creatorBId, setCreatorBId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [resolveTarget, setResolveTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-prediction-events"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("admin", { body: { action: "list_prediction_events" } });
      return data?.events || [];
    },
  });

  const { data: creators } = useQuery({
    queryKey: ["admin-creators-for-prediction"],
    queryFn: async () => {
      const { data } = await supabase.from("creators").select("id, name, avatar_url, rank").order("rank", { ascending: true });
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("admin", {
        body: { action: "create_prediction_event", title, description, creator_a_id: creatorAId, creator_b_id: creatorBId, bet_deadline: deadline },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("예측 대결이 생성되었습니다!");
      setCreateOpen(false);
      setTitle(""); setDescription(""); setCreatorAId(""); setCreatorBId(""); setDeadline(""); setSearchA(""); setSearchB("");
      queryClient.invalidateQueries({ queryKey: ["admin-prediction-events"] });
    },
    onError: (e: any) => toast.error(`생성 실패: ${e.message}`),
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ event_id, winner_id }: { event_id: string; winner_id: string }) => {
      const { data, error } = await supabase.functions.invoke("admin", {
        body: { action: "resolve_prediction_event", event_id, winner_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("결과가 확정되었습니다!");
      setResolveTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-prediction-events"] });
    },
    onError: (e: any) => toast.error(`확정 실패: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (event_id: string) => {
      const { error } = await supabase.functions.invoke("admin", {
        body: { action: "delete_prediction_event", event_id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("삭제 완료");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-prediction-events"] });
    },
    onError: (e: any) => toast.error(`삭제 실패: ${e.message}`),
  });

  const filteredA = (creators || []).filter((c: any) => !searchA.trim() || c.name.toLowerCase().includes(searchA.toLowerCase()));
  const filteredB = (creators || []).filter((c: any) => !searchB.trim() || c.name.toLowerCase().includes(searchB.toLowerCase()));

  const getStatusBadge = (status: string) => {
    if (status === "open") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">진행 중</Badge>;
    if (status === "closed") return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">마감</Badge>;
    return <Badge className="bg-muted text-muted-foreground text-[10px]">종료</Badge>;
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">{(events || []).length}건</Badge>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />새 대결
          </Button>
        </div>

        {(events || []).map((event: any) => (
          <div key={event.id} className="glass rounded-xl border border-glass-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              {getStatusBadge(event.status)}
              <span className="text-sm font-bold text-foreground flex-1 truncate">{event.title}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{event.creator_a?.name || "?"}</span>
              <span className="font-bold text-foreground/50">VS</span>
              <span>{event.creator_b?.name || "?"}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              마감: {new Date(event.bet_deadline).toLocaleString("ko-KR")} · 풀: {event.total_pool}표
            </div>
            <div className="flex gap-1">
              {event.status !== "resolved" && (
                <button onClick={() => setResolveTarget(event)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <Trophy className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setDeleteTarget(event)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {(events || []).length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">아직 예측 대결이 없습니다.</div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base font-bold">새 예측 대결 생성</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">제목</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="예: 이번 주 구독자 대결!" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">설명 (선택)</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="대결 설명..." />
            </div>

            {/* Creator A */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">크리에이터 A</label>
              <Input value={searchA} onChange={(e) => { setSearchA(e.target.value); setCreatorAId(""); }} placeholder="이름 검색..." className="text-sm" />
              {searchA && !creatorAId && (
                <div className="max-h-32 overflow-y-auto glass-sm rounded-lg p-1 space-y-0.5">
                  {filteredA.slice(0, 10).map((c: any) => (
                    <button key={c.id} onClick={() => { setCreatorAId(c.id); setSearchA(c.name); }}
                      className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50 text-left">
                      <img src={c.avatar_url?.startsWith("http") || c.avatar_url?.startsWith("/") ? c.avatar_url : "/placeholder.svg"} alt="" className="w-6 h-6 rounded-full object-cover bg-muted" />
                      <span className="text-xs font-medium truncate">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">#{c.rank}</span>
                    </button>
                  ))}
                </div>
              )}
              {creatorAId && <Badge variant="secondary" className="text-xs">{searchA} ✓</Badge>}
            </div>

            {/* Creator B */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">크리에이터 B</label>
              <Input value={searchB} onChange={(e) => { setSearchB(e.target.value); setCreatorBId(""); }} placeholder="이름 검색..." className="text-sm" />
              {searchB && !creatorBId && (
                <div className="max-h-32 overflow-y-auto glass-sm rounded-lg p-1 space-y-0.5">
                  {filteredB.slice(0, 10).map((c: any) => (
                    <button key={c.id} onClick={() => { setCreatorBId(c.id); setSearchB(c.name); }}
                      className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50 text-left">
                      <img src={c.avatar_url?.startsWith("http") || c.avatar_url?.startsWith("/") ? c.avatar_url : "/placeholder.svg"} alt="" className="w-6 h-6 rounded-full object-cover bg-muted" />
                      <span className="text-xs font-medium truncate">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">#{c.rank}</span>
                    </button>
                  ))}
                </div>
              )}
              {creatorBId && <Badge variant="secondary" className="text-xs">{searchB} ✓</Badge>}
            </div>

            {/* Deadline */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">베팅 마감일</label>
              <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>

            <Button onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !title.trim() || !creatorAId || !creatorBId || !deadline} className="w-full">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}생성
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveTarget} onOpenChange={(v) => !v && setResolveTarget(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-base font-bold">승자 확정</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">"{resolveTarget?.title}" 대결의 승자를 선택하세요.</p>
          <div className="flex gap-2 pt-2">
            <Button onClick={() => resolveTarget && resolveMutation.mutate({ event_id: resolveTarget.id, winner_id: resolveTarget.creator_a_id })}
              disabled={resolveMutation.isPending} variant="outline" className="flex-1 text-xs">
              {resolveTarget?.creator_a?.name || "A"}
            </Button>
            <Button onClick={() => resolveTarget && resolveMutation.mutate({ event_id: resolveTarget.id, winner_id: resolveTarget.creator_b_id })}
              disabled={resolveMutation.isPending} variant="outline" className="flex-1 text-xs">
              {resolveTarget?.creator_b?.name || "B"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-base font-bold">예측 대결 삭제</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">"{deleteTarget?.title}"</span>을(를) 삭제하시겠습니까? 관련 베팅도 모두 삭제됩니다.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">취소</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="flex-1">
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminPanelPage;
