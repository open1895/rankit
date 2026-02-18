import { useRef } from "react";
import { Crown, Swords, Zap, Share2, X } from "lucide-react";
import { Creator } from "@/lib/data";
import { toast } from "sonner";

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
  const isFirst = gap === null || gap <= 0;
  const totalForBar = aboveCreator
    ? aboveCreator.votes_count + creator.votes_count
    : creator.votes_count;
  const progress = totalForBar > 0 ? (creator.votes_count / totalForBar) * 100 : 50;

  const shareText = isFirst
    ? `${creator.name}님이 현재 1위를 수성 중입니다! 지금 투표하러 오세요! ${siteUrl}`
    : `${creator.name}님이 다음 순위까지 단 ${gap}표 남았습니다! 지금 투표하러 오세요! ${siteUrl}`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Rank It - 역전 임박!",
          text: shareText,
          url: siteUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success("공유 링크가 복사되었습니다!");
      }
      if (!shared) {
        onShared();
        onShareBonus();
        toast.success("🎉 추가 투표권 1개를 받았습니다!");
      }
    } catch {
      // User cancelled
    }
  };

  const initials = (name: string) => name.slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />

      <div
        className="relative w-full max-w-sm animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Outer glow */}
        <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-[hsl(var(--neon-purple)/0.4)] via-[hsl(330_80%_60%/0.2)] to-[hsl(var(--neon-cyan)/0.3)] blur-2xl pointer-events-none" />
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-[hsl(var(--neon-purple)/0.5)] to-[hsl(var(--neon-cyan)/0.3)] blur-[1px] pointer-events-none" />

        {/* Card body */}
        <div className="relative rounded-2xl overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(270_40%_8%)] via-[hsl(270_50%_12%)] to-[hsl(230_30%_6%)]" />
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--neon-purple)/0.15)] via-transparent to-[hsl(var(--neon-cyan)/0.1)]" />

          {/* Mesh dots decoration */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--neon-purple)) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }} />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-[hsl(var(--muted)/0.5)] text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative p-6 space-y-5">
            {/* Header badge */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[hsl(330_80%_60%/0.15)] border border-[hsl(330_80%_60%/0.3)] text-[hsl(330_80%_60%)] text-[10px] font-bold tracking-wider uppercase">
                <Zap className="w-3 h-3" />
                {isFirst ? "1위 수성 중" : "역전 임박"}
              </div>
            </div>

            {/* Main message */}
            <div className="text-center space-y-1">
              {isFirst ? (
                <h3 className="text-lg font-black text-foreground">
                  <span className="text-[hsl(var(--neon-cyan))] neon-text-cyan">{creator.name}</span>
                  <span className="block text-sm mt-1 font-semibold">
                    👑 당당한 <span className="text-[hsl(var(--neon-cyan))]">1위</span> 수성 중!
                  </span>
                </h3>
              ) : (
                <h3 className="text-lg font-black text-foreground leading-snug">
                  <span className="text-[hsl(var(--neon-cyan))] neon-text-cyan">{creator.name}</span> 님이
                  <span className="block mt-0.5">
                    {aboveCreator ? `${aboveCreator.rank}위` : ""} 탈환까지 단{" "}
                    <span className="text-2xl text-[hsl(330_80%_60%)] font-black animate-pulse" style={{
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
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[hsl(330_80%_60%/0.4)] to-transparent blur-md" />
                      <div className="relative w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shadow-lg">
                        {initials(aboveCreator.name)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground truncate">{aboveCreator.name}</p>
                      <p className="text-[10px] text-muted-foreground">{aboveCreator.rank}위</p>
                      <p className="text-xs font-bold text-[hsl(330_80%_60%)]">
                        {aboveCreator.votes_count.toLocaleString()}표
                      </p>
                    </div>
                  </div>

                  {/* VS Badge */}
                  <div className="relative shrink-0">
                    <div className="absolute -inset-3 rounded-full bg-[hsl(var(--neon-purple)/0.3)] blur-xl" />
                    <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(var(--neon-purple))] to-[hsl(330_80%_60%)] flex items-center justify-center shadow-lg shadow-[hsl(var(--neon-purple)/0.4)]">
                      <Swords className="w-5 h-5 text-primary-foreground" />
                    </div>
                  </div>

                  {/* Current creator (challenger) */}
                  <div className="flex-1 text-center space-y-2">
                    <div className="relative mx-auto w-14 h-14">
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[hsl(var(--neon-cyan)/0.4)] to-transparent blur-md" />
                      <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[hsl(var(--neon-cyan))] to-[hsl(var(--neon-purple))] flex items-center justify-center text-sm font-bold text-primary-foreground shadow-lg">
                        {initials(creator.name)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground truncate">{creator.name}</p>
                      <p className="text-[10px] text-muted-foreground">{creator.rank}위</p>
                      <p className="text-xs font-bold text-[hsl(var(--neon-cyan))]">
                        {creator.votes_count.toLocaleString()}표
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="relative h-3 rounded-full overflow-hidden bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--glass-border)/0.3)]">
                    {/* Opponent bar (from right) */}
                    <div className="absolute inset-0 flex">
                      <div
                        className="h-full bg-gradient-to-r from-[hsl(var(--neon-cyan))] to-[hsl(var(--neon-purple)/0.7)] transition-all duration-1000 ease-out rounded-l-full"
                        style={{ width: `${progress}%` }}
                      />
                      <div
                        className="h-full bg-gradient-to-l from-[hsl(330_80%_60%)] to-[hsl(var(--neon-purple)/0.5)] transition-all duration-1000 ease-out rounded-r-full"
                        style={{ width: `${100 - progress}%` }}
                      />
                    </div>
                    {/* Divider spark */}
                    <div
                      className="absolute top-0 h-full w-0.5 bg-foreground/80 shadow-[0_0_6px_hsl(var(--foreground)/0.5)] transition-all duration-1000"
                      style={{ left: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                    <span>{creator.name}</span>
                    <span className="text-[hsl(330_80%_60%)] font-bold">Gap: {gap}표</span>
                    <span>{aboveCreator.name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 1st place special layout */}
            {isFirst && (
              <div className="flex justify-center py-2">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-[hsl(45_100%_60%/0.3)] to-transparent blur-2xl animate-pulse" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[hsl(45_100%_60%)] to-[hsl(30_100%_50%)] flex items-center justify-center shadow-xl shadow-[hsl(45_100%_60%/0.3)]">
                    <Crown className="w-10 h-10 text-background" />
                  </div>
                </div>
              </div>
            )}

            {/* CTA section */}
            <div className="space-y-3 pt-1">
              <p className="text-center text-xs text-muted-foreground leading-relaxed">
                당신의 <span className="text-[hsl(var(--neon-cyan))] font-semibold">1표</span>가 역전의 한 수가 됩니다.
                <br />지금 바로 투표하세요!
              </p>

              {/* Share button */}
              <button
                onClick={handleShare}
                disabled={shared}
                className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                  shared
                    ? "glass-sm text-muted-foreground"
                    : "bg-gradient-to-r from-[hsl(var(--neon-purple))] via-[hsl(330_80%_60%)] to-[hsl(var(--neon-cyan))] text-white shadow-lg shadow-[hsl(var(--neon-purple)/0.4)] hover:shadow-xl hover:shadow-[hsl(330_80%_60%/0.4)] hover:scale-[1.02] active:scale-[0.98]"
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
            </div>

            {/* Footer: Logo */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="w-5 h-5 rounded-md gradient-primary flex items-center justify-center">
                <Crown className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="text-[10px] font-bold gradient-text tracking-wide">RANK IT</span>
              <span className="text-[8px] text-muted-foreground/50">·</span>
              <span className="text-[8px] text-muted-foreground/50">fan-powered ranking</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OvertakeShareCard;
