import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Crown } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Also check URL hash for recovery type
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("비밀번호가 변경되었습니다! 🎉");
      navigate("/");
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-background mesh-bg flex flex-col items-center justify-center px-4">
        <SEOHead title="비밀번호 재설정" description="비밀번호를 재설정합니다." path="/reset-password" noIndex />
        <div className="w-full max-w-sm glass p-6 text-center space-y-4">
          <Crown className="w-10 h-10 mx-auto text-primary" />
          <h2 className="text-lg font-bold">유효하지 않은 링크</h2>
          <p className="text-sm text-muted-foreground">비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다.</p>
          <Button onClick={() => navigate("/auth")} className="w-full gradient-primary text-primary-foreground">
            로그인으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background mesh-bg flex flex-col items-center justify-center px-4">
      <SEOHead title="새 비밀번호 설정" description="새 비밀번호를 설정합니다." path="/reset-password" noIndex />
      <div className="w-full max-w-sm glass p-6 space-y-6 animate-fade-in-up">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Lock className="w-7 h-7 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold">새 비밀번호 설정</h2>
          <p className="text-sm text-muted-foreground">새로운 비밀번호를 입력해주세요</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="새 비밀번호 (6자 이상)"
              className="pl-10 h-12 glass-sm border-glass-border"
              minLength={6}
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호 확인"
              className="pl-10 h-12 glass-sm border-glass-border"
              minLength={6}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base font-bold gradient-primary text-primary-foreground rounded-xl neon-glow-purple"
          >
            {loading ? "처리 중..." : "비밀번호 변경"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
