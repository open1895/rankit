import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Loader2, Shield, ExternalLink, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";

const ADMIN_SESSION_KEY = "rankit_admin_authenticated";

const AdminPanelPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (sessionStorage.getItem(ADMIN_SESSION_KEY) === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("admin", {
        body: { action: "verify_password", password },
      });

      if (fnError || !data?.verified) {
        setError("접근 권한이 없습니다");
        setPassword("");
        return;
      }

      sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
      sessionStorage.setItem("rankit_admin_pw", password);
      setIsAuthenticated(true);
      toast.success("관리자 인증 완료");
    } catch {
      setError("접근 권한이 없습니다");
      setPassword("");
    }
  };

  // Fetch pending nominations
  const { data: nominations, isLoading } = useQuery({
    queryKey: ["pending-nominations"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("admin", {
        body: { action: "list_nominations", admin_password: sessionStorage.getItem("rankit_admin_pw") },
      });
      return (data?.nominations || []).filter(
        (n: any) => n.status === "pending"
      );
    },
    enabled: isAuthenticated,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (nominationId: string) => {
      const { data, error } = await supabase.functions.invoke("admin", {
        body: { action: "approve_nomination", nomination_id: nominationId, admin_password: sessionStorage.getItem("rankit_admin_pw") },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("크리에이터가 승인되었습니다! 소셜 데이터 동기화가 시작됩니다.");
      queryClient.invalidateQueries({ queryKey: ["pending-nominations"] });
    },
    onError: (err: any) => {
      toast.error(`승인 실패: ${err.message}`);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (nominationId: string) => {
      const { data, error } = await supabase.functions.invoke("admin", {
        body: { action: "reject_nomination", nomination_id: nominationId, admin_password: sessionStorage.getItem("rankit_admin_pw") },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("후보가 반려되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["pending-nominations"] });
    },
    onError: (err: any) => {
      toast.error(`반려 실패: ${err.message}`);
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-sm mx-auto p-6">
          <form onSubmit={handleLogin} className="glass rounded-xl border border-glass-border p-8 space-y-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">관리자 인증</h2>
              <p className="text-sm text-muted-foreground text-center">
                관리자 비밀번호를 입력해주세요
              </p>
            </div>

            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="text-center"
              autoFocus
            />

            {error && (
              <p className="text-sm text-destructive text-center font-medium">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={!password}>
              인증
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 pb-0">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">
            후보 승인
          </h1>
          <Badge variant="outline" className="ml-auto text-xs">
            대기 {nominations?.length || 0}건
          </Badge>
        </div>

        {/* Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !nominations || nominations.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            대기 중인 후보가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {nominations.map((nom: any) => (
              <div key={nom.id} className="glass rounded-xl border border-glass-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{nom.creator_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{nom.category || "-"}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(nom.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>
                </div>

                <a
                  href={nom.channel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 text-xs truncate max-w-full"
                >
                  {nom.channel_url}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>

                {nom.reason && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{nom.reason}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(nom.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9"
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    승인
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectMutation.mutate(nom.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex-1 h-9"
                  >
                    {rejectMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    반려
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default AdminPanelPage;
