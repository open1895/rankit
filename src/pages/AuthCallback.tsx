import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Naver OAuth callback handler.
 * Naver redirects here with ?code=...&state=...
 * We forward those to the naver-auth-callback edge function which exchanges
 * code for a Supabase session and returns tokens in the URL hash.
 */
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const naverError = url.searchParams.get("error");

    // If we already have an access_token in the hash, the edge function already handled it
    if (window.location.hash.includes("access_token")) {
      // Let supabase pick up the session, then redirect home
      supabase.auth.getSession().then(() => {
        navigate("/", { replace: true });
      });
      return;
    }

    if (naverError || !code) {
      navigate(`/auth#naver_error=${encodeURIComponent(naverError || "no_code")}`, { replace: true });
      return;
    }

    // Forward to the edge function with the code/state
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const callbackUrl = new URL(
      `https://${projectId}.supabase.co/functions/v1/naver-auth-callback`,
    );
    callbackUrl.searchParams.set("code", code);
    if (state) callbackUrl.searchParams.set("state", state);
    window.location.replace(callbackUrl.toString());
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground">네이버 로그인 처리 중...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
