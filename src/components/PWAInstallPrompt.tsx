import { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isIOS = () => {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
};

const isInStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true;

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;

    const dismissed = localStorage.getItem("pwa_install_dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    if (isIOS()) {
      setShowIOSGuide(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa_install_dismissed", String(Date.now()));
  };

  // iOS Safari guide
  if (showIOSGuide) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm animate-fade-in-up">
        <div className="glass rounded-2xl border border-neon-purple/30 p-4 shadow-xl">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--primary)))" }}
            >
              <Download className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="space-y-2.5 flex-1">
              <div>
                <p className="text-sm font-bold text-foreground">Rankit 앱 설치</p>
                <p className="text-[11px] text-muted-foreground">홈 화면에 추가하면 더 빠르게 접속할 수 있어요!</p>
              </div>
              <div className="space-y-1.5 bg-muted/50 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">1</div>
                  <div className="flex items-center gap-1 text-xs text-foreground">
                    <span>하단의</span>
                    <Share className="w-3.5 h-3.5 text-primary" />
                    <span className="font-semibold">공유</span>
                    <span>버튼 탭</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">2</div>
                  <div className="flex items-center gap-1 text-xs text-foreground">
                    <PlusSquare className="w-3.5 h-3.5 text-primary" />
                    <span className="font-semibold">홈 화면에 추가</span>
                    <span>선택</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chrome/Edge install prompt
  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm animate-fade-in-up">
      <div className="glass rounded-2xl border border-neon-purple/30 p-4 shadow-xl">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--primary)))" }}
          >
            <Download className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="space-y-2 flex-1">
            <div>
              <p className="text-sm font-bold text-foreground">Rankit 앱 설치</p>
              <p className="text-[11px] text-muted-foreground">홈 화면에 추가하면 더 빠르게 접속할 수 있어요!</p>
            </div>
            <Button
              onClick={handleInstall}
              size="sm"
              className="w-full text-xs font-bold"
              style={{
                background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--primary)))",
              }}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              홈 화면에 추가
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
