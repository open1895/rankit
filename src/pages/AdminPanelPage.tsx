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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            후보 승인 대시보드
          </h1>
          <Badge variant="outline" className="ml-auto">
            대기 {nominations?.length || 0}건
          </Badge>
        </div>

        {/* Table */}
        <div className="glass rounded-xl border border-glass-border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !nominations || nominations.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              대기 중인 후보가 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>크리에이터명</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>채널 URL</TableHead>
                  <TableHead>추천 사유</TableHead>
                  <TableHead>신청일</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nominations.map((nom: any) => (
                  <TableRow key={nom.id}>
                    <TableCell className="font-medium">{nom.creator_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{nom.category || "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      <a
                        href={nom.channel_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 text-sm max-w-[200px] truncate"
                      >
                        {nom.channel_url}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {nom.reason || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(nom.created_at).toLocaleDateString("ko-KR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(nom.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
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
                        >
                          {rejectMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          반려
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AdminPanelPage;
