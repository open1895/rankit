import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, X, Loader2, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const AdminPanelPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Check admin role
  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  // Fetch pending nominations
  const { data: nominations, isLoading } = useQuery({
    queryKey: ["pending-nominations"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("admin", {
        body: { action: "list_nominations" },
      });
      // Filter pending only
      return (data?.nominations || []).filter(
        (n: any) => n.status === "pending"
      );
    },
    enabled: isAdmin === true,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (nominationId: string) => {
      const { data, error } = await supabase.functions.invoke("admin", {
        body: { action: "approve_nomination", nomination_id: nominationId },
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
        body: { action: "reject_nomination", nomination_id: nominationId },
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

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
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
    </div>
  );
};

export default AdminPanelPage;
