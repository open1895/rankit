import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, MailX } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type Status =
  | "validating"
  | "valid"
  | "invalid"
  | "already"
  | "submitting"
  | "success"
  | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>("validating");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const validate = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
          setErrorMsg(data?.error ?? "유효하지 않은 링크입니다.");
          return;
        }
        if (data?.reason === "already_unsubscribed") {
          setStatus("already");
          return;
        }
        if (data?.valid) {
          setStatus("valid");
          return;
        }
        setStatus("invalid");
      } catch (e) {
        setStatus("invalid");
        setErrorMsg("네트워크 오류가 발생했습니다.");
      }
    };
    validate();
  }, [token]);

  const handleConfirm = async () => {
    setStatus("submitting");
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON,
          },
          body: JSON.stringify({ token }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data?.error ?? "수신 거부 처리에 실패했습니다.");
        return;
      }
      if (data?.reason === "already_unsubscribed") {
        setStatus("already");
        return;
      }
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setErrorMsg("네트워크 오류가 발생했습니다.");
    }
  };

  return (
    <>
      <SEOHead
        title="이메일 수신 거부 - Rankit"
        description="랭킷 이메일 알림 수신을 거부합니다."
      />
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2">
              {status === "validating" || status === "submitting" ? (
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              ) : status === "success" || status === "already" ? (
                <CheckCircle2 className="w-12 h-12 text-primary" />
              ) : status === "valid" ? (
                <MailX className="w-12 h-12 text-primary" />
              ) : (
                <XCircle className="w-12 h-12 text-destructive" />
              )}
            </div>
            <CardTitle>
              {status === "validating" && "확인 중..."}
              {status === "valid" && "이메일 수신 거부"}
              {status === "submitting" && "처리 중..."}
              {status === "success" && "수신 거부 완료"}
              {status === "already" && "이미 수신 거부됨"}
              {status === "invalid" && "유효하지 않은 링크"}
              {status === "error" && "오류 발생"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status === "valid" && (
              <>
                <p className="text-muted-foreground text-sm">
                  랭킷에서 발송하는 모든 알림 이메일 수신을 거부하시겠습니까?
                  <br />
                  이 작업은 되돌릴 수 없습니다.
                </p>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleConfirm}
                >
                  수신 거부 확인
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  asChild
                >
                  <a href="/">취소하고 홈으로</a>
                </Button>
              </>
            )}
            {status === "success" && (
              <>
                <p className="text-muted-foreground text-sm">
                  앞으로 랭킷에서 알림 이메일을 보내지 않습니다.
                  <br />
                  그동안 이용해 주셔서 감사합니다.
                </p>
                <Button asChild className="w-full">
                  <a href="/">홈으로 가기</a>
                </Button>
              </>
            )}
            {status === "already" && (
              <>
                <p className="text-muted-foreground text-sm">
                  이 이메일 주소는 이미 수신 거부 처리되었습니다.
                </p>
                <Button asChild className="w-full">
                  <a href="/">홈으로 가기</a>
                </Button>
              </>
            )}
            {(status === "invalid" || status === "error") && (
              <>
                <p className="text-muted-foreground text-sm">
                  {errorMsg || "링크가 유효하지 않거나 만료되었습니다."}
                </p>
                <Button asChild className="w-full">
                  <a href="/">홈으로 가기</a>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Unsubscribe;
