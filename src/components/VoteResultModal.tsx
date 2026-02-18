import { useState } from "react";
import { Share2, X, Zap } from "lucide-react";
import { toast } from "sonner";

interface VoteResultModalProps {
  show: boolean;
  creatorName: string;
  gap: number | null; // null = already #1
  siteUrl: string;
  onClose: () => void;
  onBonusVote: () => void;
}

const VoteResultModal = ({ show, creatorName, gap, siteUrl, onClose, onBonusVote }: VoteResultModalProps) => {
  const [shared, setShared] = useState(false);

  if (!show) return null;

  const isFirst = gap === null || gap <= 0;

  const shareText = isFirst
    ? `${creatorName}님이 현재 1위를 수성 중입니다! 지금 투표하러 오세요! ${siteUrl}`
    : `${creatorName}님이 다음 순위까지 단 ${gap}표 남았습니다! 지금 투표하러 오세요! ${siteUrl}`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Rank It - 크리에이터 투표",
          text: shareText,
          url: siteUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success("공유 링크가 복사되었습니다!");
      }
      if (!shared) {
        setShared(true);
        onBonusVote();
        toast.success("🎉 추가 투표권 1개를 받았습니다!");
      }
    } catch (e) {
      // User cancelled share - that's ok
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient glow */}
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[hsl(var(--neon-purple)/0.25)] via-transparent to-[hsl(var(--neon-cyan)/0.2)] blur-2xl pointer-events-none" />
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[hsl(var(--neon-purple)/0.4)] to-[hsl(var(--neon-cyan)/0.3)] blur-md pointer-events-none" />

        <div className="relative glass rounded-2xl p-6 space-y-5 border border-[hsl(var(--neon-purple)/0.3)]">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Main message */}
          <div className="text-center space-y-2 pt-2">
            {isFirst ? (
              <>
                <div className="text-3xl">👑</div>
                <h3 className="text-lg font-bold text-foreground">
                  <span className="text-neon-cyan">1위</span> 수성 중!
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {creatorName}님이 정상을 지키고 있어요!<br />
                  공유로 더 굳건하게 만들어 주세요.
                </p>
              </>
            ) : (
              <>
                <div className="text-3xl">🔥</div>
                <h3 className="text-lg font-bold text-foreground">
                  한 계단 상승까지 단{" "}
                  <span className="text-[hsl(330,80%,60%)] text-2xl font-black animate-pulse">
                    {gap}
                  </span>
                  표!
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  지금 지원군을 요청해서 순위를 뒤집어보세요.<br />
                  당신의 공유 한 번이 역전의 시작이 됩니다!
                  <span className="block text-neon-cyan font-semibold mt-1">
                    (+추가투표권 1개)
                  </span>
                </p>
              </>
            )}
          </div>

          {/* Share button */}
          <button
            onClick={handleShare}
            disabled={shared}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
              shared
                ? "glass-sm text-muted-foreground"
                : "bg-gradient-to-r from-[hsl(var(--neon-purple))] via-[hsl(330,80%,60%)] to-[hsl(var(--neon-cyan))] text-white shadow-lg shadow-[hsl(var(--neon-purple)/0.3)] hover:shadow-xl hover:shadow-[hsl(var(--neon-purple)/0.4)] hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {shared ? (
              <>✅ 공유 완료! 투표권 +1</>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                공유하고 응원하기
                <Zap className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Skip */}
          <button
            onClick={onClose}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            다음에 할게요
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoteResultModal;
