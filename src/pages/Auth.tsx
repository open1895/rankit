import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Crown, Mail, Lock, User, ArrowLeft, ExternalLink, Copy, AlertTriangle } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { PrivacyPolicyModal, TermsOfServiceModal } from "@/components/LegalModals";
import { isInAppBrowser, getInAppBrowserName, openInExternalBrowser } from "@/lib/browser";

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isWebView, setIsWebView] = useState(false);
  const [webViewName, setWebViewName] = useState<string | null>(null);

  useEffect(() => {
    const inApp = isInAppBrowser();
    setIsWebView(inApp);
    if (inApp) setWebViewName(getInAppBrowserName());
  }, []);

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message === "Email not confirmed") {
          toast.error("이메일 인증이 필요합니다. 가입 시 받은 이메일을 확인해주세요.", {
            action: {
              label: "재발송",
              onClick: () => handleResendConfirmation(),
            },
          });
        } else {
          toast.error(error.message === "Invalid login credentials"
            ? "이메일 또는 비밀번호가 올바르지 않습니다."
            : error.message);
        }
      } else {
        toast.success("로그인 성공! 🎉");
        navigate("/");
      }
    } else {
      if (!agreedTerms || !agreedPrivacy) {
        toast.error("이용약관과 개인정보 처리방침에 동의해주세요.");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: displayName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("가입 완료! 이메일을 확인해주세요. 📧", { duration: 5000 });
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("이메일을 입력해주세요.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("비밀번호 재설정 링크를 이메일로 보냈습니다. 📧", { duration: 5000 });
      setIsForgotPassword(false);
    }
    setLoading(false);
  };

  const handleResendConfirmation = async () => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (error) {
      toast.error("이메일 재발송에 실패했습니다.");
    } else {
      toast.success("인증 이메일을 다시 보냈습니다. 📧");
    }
  };

  const isOAuthProviderNotConfiguredError = (message: string) => {
    return (
      message.includes("validation_failed") ||
      message.includes("Unsupported provider") ||
      message.includes("missing OAuth secret") ||
      message.includes("OAuth secret")
    );
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (error) throw error;
    } catch (err: any) {
      const msg = String(err?.message || err || "");
      if (isOAuthProviderNotConfiguredError(msg)) {
        toast.error("Google 로그인 설정이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
      } else {
        toast.error("Google 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background mesh-bg flex flex-col">
      <SEOHead title="로그인" description="Rank It에 로그인하여 크리에이터에게 투표하고 팬 랭킹에 참여하세요." path="/auth" noIndex />
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => isForgotPassword ? setIsForgotPassword(false) : navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-neon-purple" />
            <span className="text-lg font-bold gradient-text">
              {isForgotPassword ? "비밀번호 재설정" : isLogin ? "로그인" : "회원가입"}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-lg mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <div className="w-full glass p-6 space-y-6 animate-fade-in-up">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Crown className="w-7 h-7 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold">
              {isForgotPassword ? "비밀번호를 잊으셨나요?" : isLogin ? "다시 만나서 반가워요!" : "Rankit에 가입하세요"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isForgotPassword
                ? "가입한 이메일을 입력하면 재설정 링크를 보내드려요"
                : isLogin
                  ? "로그인하고 투표에 참여하세요"
                  : "계정을 만들고 좋아하는 크리에이터를 응원하세요"}
            </p>
          </div>

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일"
                  className="pl-10 h-12 glass-sm border-glass-border"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-bold gradient-primary text-primary-foreground rounded-xl neon-glow-purple"
              >
                {loading ? "처리 중..." : "재설정 링크 보내기"}
              </Button>
              <div className="text-center">
                <button onClick={() => setIsForgotPassword(false)} className="text-sm text-neon-cyan hover:underline">
                  로그인으로 돌아가기
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Google Login */}
              <Button
                onClick={handleGoogleLogin}
                variant="outline"
                className="w-full h-12 glass-sm border-glass-border hover:border-neon-cyan/50 text-sm font-medium"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google로 계속하기
              </Button>

              {/* Apple Login - hidden until credentials are configured */}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full section-divider" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground rounded-full">또는</span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {!isLogin && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="닉네임"
                      className="pl-10 h-12 glass-sm border-glass-border"
                      required
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일"
                    className="pl-10 h-12 glass-sm border-glass-border"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호 (6자 이상)"
                    className="pl-10 h-12 glass-sm border-glass-border"
                    minLength={6}
                    required
                  />
                </div>

                {/* Terms Agreement - signup only */}
                {!isLogin && (
                  <div className="space-y-2 p-3 rounded-xl bg-muted/30">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="terms"
                        checked={agreedTerms}
                        onCheckedChange={(v) => setAgreedTerms(v === true)}
                        className="mt-0.5"
                      />
                      <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                        <button type="button" onClick={() => setShowTerms(true)} className="text-primary hover:underline font-medium">이용약관</button>에 동의합니다 (필수)
                      </label>
                    </div>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="privacy"
                        checked={agreedPrivacy}
                        onCheckedChange={(v) => setAgreedPrivacy(v === true)}
                        className="mt-0.5"
                      />
                      <label htmlFor="privacy" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                        <button type="button" onClick={() => setShowPrivacy(true)} className="text-primary hover:underline font-medium">개인정보 처리방침</button>에 동의합니다 (필수)
                      </label>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || (!isLogin && (!agreedTerms || !agreedPrivacy))}
                  className="w-full h-12 text-base font-bold gradient-primary text-primary-foreground rounded-xl neon-glow-purple"
                >
                  {loading ? "처리 중..." : isLogin ? "로그인" : "회원가입"}
                </Button>
              </form>

              {isLogin && (
                <div className="text-center">
                  <button onClick={() => setIsForgotPassword(true)} className="text-xs text-muted-foreground hover:text-primary hover:underline">
                    비밀번호를 잊으셨나요?
                  </button>
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={() => { setIsLogin(!isLogin); setAgreedTerms(false); setAgreedPrivacy(false); }}
                  className="text-sm text-neon-cyan hover:underline"
                >
                  {isLogin ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <TermsOfServiceModal open={showTerms} onOpenChange={setShowTerms} />
      <PrivacyPolicyModal open={showPrivacy} onOpenChange={setShowPrivacy} />
    </div>
  );
};

export default Auth;
