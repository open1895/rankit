import { useState, useCallback } from "react";
import { Share2, Download, Trophy, TrendingUp, Sparkles, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getPublishedOrigin } from "@/lib/clipboard";

interface CreatorRankCardProps {
  creatorId: string;
  creatorName: string;
  rank: number;
  votesCount: number;
  avatarUrl?: string;
  category?: string;
  rankitScore?: number;
}

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
};

const CreatorRankCard = ({ creatorId, creatorName, rank, votesCount, avatarUrl, category, rankitScore }: CreatorRankCardProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const generateCard = useCallback(async () => {
    setLoading(true);
    try {
      // Instagram story format (1080x1920)
      const W = 1080;
      const H = 1920;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#0a0a1a");
      bg.addColorStop(0.3, "#1a0a30");
      bg.addColorStop(0.6, "#0a1525");
      bg.addColorStop(1, "#0a0a1a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Decorative glows
      ctx.globalAlpha = 0.15;
      const g1 = ctx.createRadialGradient(W / 2, 400, 0, W / 2, 400, 500);
      g1.addColorStop(0, "#8B5CF6");
      g1.addColorStop(1, "transparent");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);
      const g2 = ctx.createRadialGradient(W / 2, 1200, 0, W / 2, 1200, 400);
      g2.addColorStop(0, "#06B6D4");
      g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      // Top logo
      ctx.font = "bold 48px 'Space Grotesk', Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#8B5CF6";
      ctx.fillText("Rank", W / 2 - 30, 140);
      const rkW = ctx.measureText("Rank").width;
      ctx.fillStyle = "#06B6D4";
      ctx.fillText("⚡", W / 2 - 30 + rkW / 2 + 20, 140);
      ctx.fillStyle = "#a78bfa";
      ctx.font = "300 48px 'Space Grotesk', Arial, sans-serif";
      ctx.fillText("it", W / 2 + rkW / 2 + 40, 140);

      ctx.font = "500 28px 'Pretendard', 'Noto Sans KR', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("CREATOR RANKING CARD", W / 2, 195);

      // Avatar
      const avSize = 280;
      const avY = 480;
      let avatarLoaded = false;
      const avatarImg = new Image();
      avatarImg.crossOrigin = "anonymous";
      if (avatarUrl) {
        await new Promise<void>((resolve) => {
          avatarImg.onload = () => { avatarLoaded = true; resolve(); };
          avatarImg.onerror = () => resolve();
          avatarImg.src = avatarUrl.startsWith("/") ? `${window.location.origin}${avatarUrl}` : avatarUrl;
          setTimeout(resolve, 3000);
        });
      }

      // Avatar glow ring
      const ringGrad = ctx.createLinearGradient(W / 2 - avSize, avY - avSize, W / 2 + avSize, avY + avSize);
      ringGrad.addColorStop(0, "#8B5CF6");
      ringGrad.addColorStop(1, "#06B6D4");
      ctx.beginPath();
      ctx.arc(W / 2, avY, avSize / 2 + 8, 0, Math.PI * 2);
      ctx.fillStyle = ringGrad;
      ctx.fill();

      if (avatarLoaded) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(W / 2, avY, avSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImg, W / 2 - avSize / 2, avY - avSize / 2, avSize, avSize);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(W / 2, avY, avSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = "#1a1040";
        ctx.fill();
        ctx.fillStyle = "#8B5CF6";
        ctx.font = "bold 96px 'Pretendard', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(creatorName.slice(0, 2), W / 2, avY);
      }

      // Creator name
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 72px 'Pretendard', 'Noto Sans KR', sans-serif";
      let displayName = creatorName;
      while (ctx.measureText(displayName).width > W - 120 && displayName.length > 2) {
        displayName = displayName.slice(0, -1);
      }
      if (displayName !== creatorName) displayName += "…";
      ctx.fillText(displayName, W / 2, 700);

      // Category
      if (category) {
        ctx.font = "600 32px 'Pretendard', sans-serif";
        ctx.fillStyle = "#a78bfa";
        ctx.fillText(category, W / 2, 760);
      }

      // Giant rank number
      ctx.font = "900 220px 'Space Grotesk', Arial, sans-serif";
      const rankGrad = ctx.createLinearGradient(W / 2 - 200, 850, W / 2 + 200, 1100);
      rankGrad.addColorStop(0, "#8B5CF6");
      rankGrad.addColorStop(1, "#06B6D4");
      ctx.fillStyle = rankGrad;
      ctx.fillText(`#${rank}`, W / 2, 980);

      // Stats cards
      const cardY = 1120;
      const cardH = 140;
      const cardGap = 30;
      const cardWidth = (W - 120 - cardGap) / 2;

      // Votes card
      ctx.fillStyle = "rgba(139, 92, 246, 0.12)";
      roundRect(ctx, 60, cardY, cardWidth, cardH, 24);
      ctx.fill();
      ctx.strokeStyle = "rgba(139, 92, 246, 0.3)";
      ctx.lineWidth = 2;
      roundRect(ctx, 60, cardY, cardWidth, cardH, 24);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "500 28px 'Pretendard', sans-serif";
      ctx.fillText("누적 투표", 60 + cardWidth / 2, cardY + 45);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px 'Space Grotesk', sans-serif";
      ctx.fillText(votesCount.toLocaleString(), 60 + cardWidth / 2, cardY + 100);

      // Score card
      const scoreX = 60 + cardWidth + cardGap;
      ctx.fillStyle = "rgba(6, 182, 212, 0.12)";
      roundRect(ctx, scoreX, cardY, cardWidth, cardH, 24);
      ctx.fill();
      ctx.strokeStyle = "rgba(6, 182, 212, 0.3)";
      ctx.lineWidth = 2;
      roundRect(ctx, scoreX, cardY, cardWidth, cardH, 24);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "500 28px 'Pretendard', sans-serif";
      ctx.fillText("영향력 점수", scoreX + cardWidth / 2, cardY + 45);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px 'Space Grotesk', sans-serif";
      ctx.fillText(Math.round(rankitScore || 0).toLocaleString(), scoreX + cardWidth / 2, cardY + 100);

      // CTA section
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      roundRect(ctx, 60, 1340, W - 120, 200, 28);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, 60, 1340, W - 120, 200, 28);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 40px 'Pretendard', sans-serif";
      ctx.fillText("이 크리에이터를 응원하세요!", W / 2, 1420);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "500 30px 'Pretendard', sans-serif";
      ctx.fillText("rankit.today에서 투표하기 →", W / 2, 1480);

      // Bottom watermark
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "400 26px 'Space Grotesk', sans-serif";
      ctx.fillText("rankit.today", W / 2, H - 100);

      // Decorative line
      const lineGrad = ctx.createLinearGradient(100, 0, W - 100, 0);
      lineGrad.addColorStop(0, "transparent");
      lineGrad.addColorStop(0.3, "#8B5CF680");
      lineGrad.addColorStop(0.7, "#06B6D480");
      lineGrad.addColorStop(1, "transparent");
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(100, 1600);
      ctx.lineTo(W - 100, 1600);
      ctx.stroke();

      setImageUrl(canvas.toDataURL("image/png"));
      setShowModal(true);
    } catch (e) {
      console.error(e);
      toast.error("카드 생성 실패");
    } finally {
      setLoading(false);
    }
  }, [creatorName, rank, votesCount, avatarUrl, category, rankitScore]);

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `rankit-${creatorName}-rank${rank}.png`;
    a.click();
    toast.success("이미지가 다운로드되었습니다!");
  };

  const handleShare = async () => {
    if (!imageUrl) return;
    const shareUrl = `${getPublishedOrigin()}/creator/${creatorId}`;
    const shareText = `🏆 ${creatorName} 현재 ${rank}위! ${votesCount.toLocaleString()}표 달성!\n나도 투표하러 가기 → ${shareUrl}`;

    if (navigator.share) {
      try {
        // Convert to blob for native share
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const file = new File([blob], `rankit-${creatorName}.png`, { type: "image/png" });
        await navigator.share({ title: `${creatorName} - Rankit`, text: shareText, files: [file] });
      } catch {
        // Fallback to text share
        try { await navigator.share({ title: `${creatorName} - Rankit`, text: shareText }); } catch { /* cancelled */ }
      }
    } else {
      await navigator.clipboard?.writeText(shareText);
      toast.success("공유 텍스트가 복사되었습니다!");
    }
  };

  return (
    <>
      {/* CTA Button - prominent in profile */}
      <button
        onClick={generateCard}
        disabled={loading}
        className="w-full group relative overflow-hidden rounded-2xl border border-primary/30 hover:border-primary/60 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-neon-purple/5 to-neon-cyan/10 group-hover:from-primary/20 group-hover:to-neon-cyan/20 transition-all" />
        <div className="relative px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-neon-cyan flex items-center justify-center">
              {loading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Sparkles className="w-5 h-5 text-white" />}
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-foreground">📸 내 순위 카드 만들기</p>
              <p className="text-[10px] text-muted-foreground">SNS에 공유해서 팬들에게 알리세요!</p>
            </div>
          </div>
          <Share2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </button>

      {/* Modal */}
      {showModal && imageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-sm glass rounded-3xl border border-glass-border/60 overflow-hidden">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full glass-sm flex items-center justify-center">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="p-4 space-y-3">
              <h3 className="text-lg font-bold text-center">🎉 랭킹 카드 완성!</h3>
              <div className="rounded-2xl overflow-hidden border border-glass-border/30">
                <img src={imageUrl} alt="Ranking Card" className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleDownload} variant="outline" className="h-11 rounded-xl glass-sm border-glass-border gap-2">
                  <Download className="w-4 h-4" />
                  저장
                </Button>
                <Button onClick={handleShare} className="h-11 rounded-xl gradient-primary text-primary-foreground gap-2">
                  <Share2 className="w-4 h-4" />
                  공유
                </Button>
              </div>
              <p className="text-[10px] text-center text-muted-foreground">인스타 스토리, 트위터, 카톡에 공유하세요!</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreatorRankCard;
