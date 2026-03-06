import { useRef, useState, useCallback } from "react";
import { Crown, Swords, Zap, Share2, X, Download, Loader2, Image } from "lucide-react";
import { Creator } from "@/lib/data";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import { toPng } from "html-to-image";

const DAILY_SHARE_LIMIT = 3;

function getShareBonusInfo(): { used: number; remaining: number } {
  const today = new Date().toISOString().slice(0, 10);
  const stored = localStorage.getItem("share_bonus_date");
  const count = parseInt(localStorage.getItem("share_bonus_count") || "0", 10);
  if (stored !== today) {
    return { used: 0, remaining: DAILY_SHARE_LIMIT };
  }
  return { used: count, remaining: Math.max(0, DAILY_SHARE_LIMIT - count) };
}

function recordShareBonus(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const stored = localStorage.getItem("share_bonus_date");
  let count = parseInt(localStorage.getItem("share_bonus_count") || "0", 10);
  if (stored !== today) {
    count = 0;
  }
  if (count >= DAILY_SHARE_LIMIT) return false;
  localStorage.setItem("share_bonus_date", today);
  localStorage.setItem("share_bonus_count", String(count + 1));
  return true;
}

interface OvertakeShareCardProps {
  creator: Creator;
  aboveCreator: Creator | null;
  gap: number | null;
  siteUrl: string;
  onClose: () => void;
  onShareBonus: () => void;
  shared: boolean;
  onShared: () => void;
}

const OvertakeShareCard = ({
  creator,
  aboveCreator,
  gap,
  siteUrl,
  onClose,
  onShareBonus,
  shared,
  onShared,
}: OvertakeShareCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);
  const isFirst = gap === null || gap <= 0;
  const totalForBar = aboveCreator
    ? aboveCreator.votes_count + creator.votes_count
    : creator.votes_count;
  const progress = totalForBar > 0 ? (creator.votes_count / totalForBar) * 100 : 50;

  const shareTextSNS = isFirst
    ? `👑 ${creator.name}님이 현재 1위를 수성 중! 지금 투표하고 함께 지켜주세요! 🔥 #RankIt #${creator.name} ${siteUrl}`
    : `🚨 역전까지 단 ${gap}표! ${creator.name}을 1위로 만들기 위해 지원군이 필요합니다! 지금 투표하고 저와 함께 역전의 주인공이 되어주세요! 🔥 #RankIt #${creator.name} ${siteUrl}`;

  const captureCard = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      setCapturing(true);
      // html-to-image can fail on mobile; retry once and add timeout
      const attempt = async () => {
        const dataUrl = await toPng(cardRef.current!, {
          quality: 0.9,
          pixelRatio: 2,
          backgroundColor: "#0d0a14",
          skipFonts: true,
          cacheBust: true,
          filter: (node: HTMLElement) => {
            // Skip elements that cause issues on mobile
            if (node.tagName === 'FILTER' || node.tagName === 'feMerge') return false;
            return true;
          },
        });
        const res = await fetch(dataUrl);
        return await res.blob();
      };

      // Add timeout to prevent infinite hang
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
      const result = await Promise.race([attempt(), timeoutPromise]);
      
      if (!result) {
        // Retry once
        const retryResult = await Promise.race([attempt(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))]);
        return retryResult;
      }
      return result;
    } catch (err) {
      console.error("Card capture failed:", err);
      return null;
    } finally {
      setCapturing(false);
    }
  }, []);

  const [bonusInfo, setBonusInfo] = useState(getShareBonusInfo);
  const canGetBonus = !shared && bonusInfo.remaining > 0;

  const handleShare = async () => {
    // Attempt card capture but don't block sharing on failure
    let blob: Blob | null = null;
    try {
      blob = await captureCard();
    } catch (err) {
      console.warn("Card capture failed, proceeding with text share:", err);
    }

    try {
      if (navigator.share) {
        const shareData: ShareData = {
          title: "Rank It - 역전 임박!",
          text: shareTextSNS,
          url: siteUrl,
        };

        // Try sharing with image if available
        if (blob && navigator.canShare) {
          const file = new File([blob], `rankit-${creator.name}-share.png`, { type: "image/png" });
          const withFiles = { ...shareData, files: [file] };
          if (navigator.canShare(withFiles)) {
            await navigator.share(withFiles);
          } else {
            await navigator.share(shareData);
          }
        } else {
          await navigator.share(shareData);
        }
      } else {
        // Fallback: copy to clipboard
        const ok = await copyToClipboard(shareTextSNS);
        if (ok) {
          toast.success("공유 텍스트가 복사되었습니다!");
        } else {
          toast.info("공유 링크: " + siteUrl);
        }
      }

      // Grant bonus with daily limit check
      if (!shared && bonusInfo.remaining > 0) {
        const granted = recordShareBonus();
        if (granted) {
          onShared();
          onShareBonus();
          setBonusInfo(getShareBonusInfo());
          toast.success(`🎉 공유 완료! 추가 투표권 +1 지급! (오늘 ${getShareBonusInfo().used}/${DAILY_SHARE_LIMIT}회 사용)`);
        } else {
          toast.info("오늘 공유 보너스를 모두 사용했습니다. (최대 3회/일)");
        }
      } else if (bonusInfo.remaining <= 0) {
        toast.info("오늘 공유 보너스를 모두 사용했습니다. (최대 3회/일)");
      }
    } catch (err: any) {
      // Only suppress AbortError (user cancelled share dialog)
      if (err?.name === "AbortError") return;
      console.error("Share failed:", err);
      // Still grant bonus if user attempted to share
      if (!shared && bonusInfo.remaining > 0) {
        const granted = recordShareBonus();
        if (granted) {
          onShared();
          onShareBonus();
          setBonusInfo(getShareBonusInfo());
          toast.success("🎉 공유 보너스 투표권 +1 지급!");
        }
      }
    }
  };

  const handleDownload = async () => {
    const blob = await captureCard();
    if (!blob) {
      toast.error("이미지 생성에 실패했습니다. 스크린샷을 이용해주세요.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rankit-${creator.name}-share.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("카드 이미지가 저장되었습니다!");
  };

  const initials = (name: string) => name.slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-6 overflow-y-auto" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />

      <div
        className="relative w-full max-w-sm animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Outer glow */}
        <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-[hsl(var(--neon-purple)/0.4)] via-[hsl(330_80%_60%/0.2)] to-[hsl(var(--neon-cyan)/0.3)] blur-2xl pointer-events-none" />
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-[hsl(var(--neon-purple)/0.5)] to-[hsl(var(--neon-cyan)/0.3)] blur-[1px] pointer-events-none" />

        {/* ============ CAPTURABLE CARD AREA ============ */}
        <div
          ref={cardRef}
          className="relative rounded-2xl overflow-hidden"
          style={{ backgroundColor: "#0d0a14" }}
        >
          {/* Background gradient */}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(180deg, hsl(270 40% 8%) 0%, hsl(270 50% 12%) 50%, hsl(230 30% 6%) 100%)",
          }} />
          <div className="absolute inset-0" style={{
            background: "linear-gradient(135deg, hsl(270 91% 65% / 0.15) 0%, transparent 50%, hsl(187 94% 42% / 0.1) 100%)",
          }} />

          {/* Mesh dots */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: "radial-gradient(circle, hsl(270 91% 65%) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }} />

          {/* Close (outside capture in overlay) */}

          <div className="relative p-6 space-y-4">
            {/* Header badge */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"
                style={{
                  background: "hsl(330 80% 60% / 0.15)",
                  border: "1px solid hsl(330 80% 60% / 0.3)",
                  color: "hsl(330 80% 60%)",
                }}>
                <Zap className="w-3 h-3" />
                {isFirst ? "1위 수성 중" : "역전 임박"}
              </div>
            </div>

            {/* Main message */}
            <div className="text-center space-y-1">
              {isFirst ? (
                <h3 className="text-lg font-black" style={{ color: "hsl(210 40% 95%)" }}>
                  <span style={{ color: "hsl(187 94% 42%)", textShadow: "0 0 10px hsl(187 94% 42% / 0.5)" }}>
                    {creator.name}
                  </span>
                  <span className="block text-sm mt-1 font-semibold">
                    👑 당당한 <span style={{ color: "hsl(187 94% 42%)" }}>1위</span> 수성 중!
                  </span>
                </h3>
              ) : (
                <h3 className="text-lg font-black leading-snug" style={{ color: "hsl(210 40% 95%)" }}>
                  <span style={{ color: "hsl(187 94% 42%)", textShadow: "0 0 10px hsl(187 94% 42% / 0.5)" }}>
                    {creator.name}
                  </span>{" "}님이
                  <span className="block mt-0.5">
                    {aboveCreator ? `${aboveCreator.rank}위` : ""} 탈환까지 단{" "}
                    <span className="text-2xl font-black animate-pulse" style={{
                      color: "hsl(330 80% 60%)",
                      textShadow: "0 0 12px hsl(330 80% 60% / 0.6), 0 0 30px hsl(330 80% 60% / 0.3)",
                    }}>
                      {gap}
                    </span>
                    표! 🔥
                  </span>
                </h3>
              )}
            </div>

            {/* VS Battle Layout */}
            {!isFirst && aboveCreator && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  {/* Above creator (opponent) */}
                  <div className="flex-1 text-center space-y-2">
                    <div className="relative mx-auto w-14 h-14">
                      <div className="absolute -inset-1 rounded-full blur-md" style={{ background: "linear-gradient(135deg, hsl(330 80% 60% / 0.4), transparent)" }} />
                      <div className="relative w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
                        style={{ background: "linear-gradient(135deg, hsl(270 91% 65%), hsl(187 94% 42%))", color: "white" }}>
                        {initials(aboveCreator.name)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold truncate" style={{ color: "hsl(210 40% 95%)" }}>{aboveCreator.name}</p>
                      <p className="text-[10px]" style={{ color: "hsl(215 20% 55%)" }}>{aboveCreator.rank}위</p>
                      <p className="text-xs font-bold" style={{ color: "hsl(330 80% 60%)" }}>
                        {aboveCreator.votes_count.toLocaleString()}표
                      </p>
                    </div>
                  </div>

                  {/* VS Badge */}
                  <div className="relative shrink-0">
                    <div className="absolute -inset-3 rounded-full blur-xl" style={{ background: "hsl(270 91% 65% / 0.3)" }} />
                    <div className="relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                      style={{ background: "linear-gradient(135deg, hsl(270 91% 65%), hsl(330 80% 60%))", boxShadow: "0 0 20px hsl(270 91% 65% / 0.4)" }}>
                      <Swords className="w-5 h-5" style={{ color: "white" }} />
                    </div>
                  </div>

                  {/* Current creator (challenger) */}
                  <div className="flex-1 text-center space-y-2">
                    <div className="relative mx-auto w-14 h-14">
                      <div className="absolute -inset-1 rounded-full blur-md" style={{ background: "linear-gradient(135deg, hsl(187 94% 42% / 0.4), transparent)" }} />
                      <div className="relative w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
                        style={{ background: "linear-gradient(135deg, hsl(187 94% 42%), hsl(270 91% 65%))", color: "white" }}>
                        {initials(creator.name)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold truncate" style={{ color: "hsl(210 40% 95%)" }}>{creator.name}</p>
                      <p className="text-[10px]" style={{ color: "hsl(215 20% 55%)" }}>{creator.rank}위</p>
                      <p className="text-xs font-bold" style={{ color: "hsl(187 94% 42%)" }}>
                        {creator.votes_count.toLocaleString()}표
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="relative h-3 rounded-full overflow-hidden" style={{
                    background: "hsl(230 15% 18% / 0.3)",
                    border: "1px solid hsl(230 15% 25% / 0.3)",
                  }}>
                    <div className="absolute inset-0 flex">
                      <div
                        className="h-full rounded-l-full"
                        style={{
                          width: `${progress}%`,
                          background: "linear-gradient(90deg, hsl(187 94% 42%), hsl(270 91% 65% / 0.7))",
                          transition: "width 1s ease-out",
                        }}
                      />
                      <div
                        className="h-full rounded-r-full"
                        style={{
                          width: `${100 - progress}%`,
                          background: "linear-gradient(270deg, hsl(330 80% 60%), hsl(270 91% 65% / 0.5))",
                          transition: "width 1s ease-out",
                        }}
                      />
                    </div>
                    <div
                      className="absolute top-0 h-full w-0.5"
                      style={{
                        left: `${progress}%`,
                        background: "hsl(210 40% 95% / 0.8)",
                        boxShadow: "0 0 6px hsl(210 40% 95% / 0.5)",
                        transition: "left 1s ease-out",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-medium" style={{ color: "hsl(215 20% 55%)" }}>
                    <span>{creator.name}</span>
                    <span style={{ color: "hsl(330 80% 60%)", fontWeight: 700 }}>Gap: {gap}표</span>
                    <span>{aboveCreator.name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 1st place special layout */}
            {isFirst && (
              <div className="flex justify-center py-2">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full blur-2xl animate-pulse" style={{ background: "linear-gradient(135deg, hsl(45 100% 60% / 0.3), transparent)" }} />
                  <div className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl"
                    style={{ background: "linear-gradient(135deg, hsl(45 100% 60%), hsl(30 100% 50%))", boxShadow: "0 0 30px hsl(45 100% 60% / 0.3)" }}>
                    <Crown className="w-10 h-10" style={{ color: "#0d0a14" }} />
                  </div>
                </div>
              </div>
            )}

            {/* CTA text */}
            <p className="text-center text-xs leading-relaxed" style={{ color: "hsl(215 20% 55%)" }}>
              당신의 <span style={{ color: "hsl(187 94% 42%)", fontWeight: 600 }}>1표</span>가 역전의 한 수가 됩니다.
              <br />지금 바로 투표하세요!
            </p>

            {/* Footer: Rankit Logo Watermark */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(270 91% 65%), hsl(187 94% 42%))" }}>
                <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5" />
                  <path d="M5 12l7-7 7 7" />
                  <path d="M8 5l4-3 4 3" strokeWidth="1.5" />
                </svg>
              </div>
              <span className="text-[10px] font-extrabold tracking-wider"
                style={{ background: "linear-gradient(135deg, hsl(270 91% 65%), hsl(187 94% 42%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Rank<span style={{ fontWeight: 300 }}>it</span>
              </span>
              <span className="text-[8px]" style={{ color: "hsl(215 20% 55% / 0.5)" }}>·</span>
              <span className="text-[8px]" style={{ color: "hsl(215 20% 55% / 0.5)" }}>fan-powered ranking</span>
            </div>
          </div>
        </div>
        {/* ============ END CAPTURABLE CARD ============ */}

        {/* Close button (overlay, outside capture) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-[hsl(var(--muted)/0.5)] text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Action buttons below card */}
        <div className="relative mt-3 space-y-2">
          {/* Share button */}
          <button
            onClick={handleShare}
            disabled={capturing}
            className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
              shared && bonusInfo.remaining <= 0
                ? "glass-sm text-muted-foreground"
                : "bg-gradient-to-r from-[hsl(var(--neon-purple))] via-[hsl(330_80%_60%)] to-[hsl(var(--neon-cyan))] text-white shadow-lg shadow-[hsl(var(--neon-purple)/0.4)] hover:shadow-xl hover:shadow-[hsl(330_80%_60%/0.4)] hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {capturing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                카드 생성 중...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                공유하고 응원하기
                <Zap className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Share destination explanation */}
          <div className="text-center space-y-1 py-0.5">
            <p className="text-[10px] text-muted-foreground">
              📲 버튼을 누르면 <span className="font-semibold text-foreground">기기의 공유 메뉴</span>가 열립니다
            </p>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--glass))] border border-[hsl(var(--glass-border))] text-muted-foreground">📱 카카오톡</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--glass))] border border-[hsl(var(--glass-border))] text-muted-foreground">📸 인스타</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--glass))] border border-[hsl(var(--glass-border))] text-muted-foreground">💬 문자</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--glass))] border border-[hsl(var(--glass-border))] text-muted-foreground">🐦 X(트위터)</span>
            </div>
            <p className="text-[9px] text-muted-foreground/60">
              PC에서는 공유 텍스트가 클립보드에 복사됩니다
            </p>
          </div>

          {/* Daily share bonus status */}
          {bonusInfo.remaining > 0 ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-[hsl(var(--neon-purple)/0.1)] to-[hsl(var(--neon-cyan)/0.1)] border border-[hsl(var(--neon-purple)/0.25)] animate-pulse">
              <span className="text-base">🎁</span>
              <span className="text-[10px] font-bold text-foreground flex-1">
                공유하면 추가 투표권 +1! (오늘 {bonusInfo.remaining}회 남음)
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--neon-cyan)/0.15)] text-[hsl(var(--neon-cyan))] font-bold">
                {bonusInfo.used}/{DAILY_SHARE_LIMIT}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/30">
              <span className="text-base">⏰</span>
              <span className="text-[10px] text-muted-foreground flex-1">
                오늘 공유 보너스를 모두 사용했어요! (최대 {DAILY_SHARE_LIMIT}회/일)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OvertakeShareCard;
