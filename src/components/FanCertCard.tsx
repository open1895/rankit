import { useState, useRef, useCallback } from "react";
import { X, Download, Share2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FanCertCardProps {
  creatorName: string;
  creatorAvatarUrl: string;
  rank: number;
  totalCreators: number;
  onClose: () => void;
}

const FanCertCard = ({ creatorName, creatorAvatarUrl, rank, totalCreators, onClose }: FanCertCardProps) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const topPercent = totalCreators > 0 ? Math.max(1, Math.round((rank / totalCreators) * 100)) : 1;

  const generateCard = useCallback(async () => {
    setGenerating(true);
    try {
      const W = 1080;
      const H = 1920;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, "#0f0a1e");
      bgGrad.addColorStop(0.5, "#1a1030");
      bgGrad.addColorStop(1, "#0a1520");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Decorative circles
      ctx.globalAlpha = 0.08;
      const radGrad1 = ctx.createRadialGradient(200, 400, 0, 200, 400, 500);
      radGrad1.addColorStop(0, "#a855f7");
      radGrad1.addColorStop(1, "transparent");
      ctx.fillStyle = radGrad1;
      ctx.fillRect(0, 0, W, H);

      const radGrad2 = ctx.createRadialGradient(880, 1500, 0, 880, 1500, 400);
      radGrad2.addColorStop(0, "#06b6d4");
      radGrad2.addColorStop(1, "transparent");
      ctx.fillStyle = radGrad2;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      // Top decorative line
      const lineGrad = ctx.createLinearGradient(140, 0, W - 140, 0);
      lineGrad.addColorStop(0, "transparent");
      lineGrad.addColorStop(0.3, "#a855f7");
      lineGrad.addColorStop(0.7, "#06b6d4");
      lineGrad.addColorStop(1, "transparent");
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(140, 280);
      ctx.lineTo(W - 140, 280);
      ctx.stroke();

      // "FAN CERTIFICATION" small header
      ctx.fillStyle = "#a855f7";
      ctx.font = "600 36px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚡ FAN CERTIFICATION ⚡", W / 2, 240);

      // Load avatar
      let avatarLoaded = false;
      const avatarImg = new Image();
      avatarImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        avatarImg.onload = () => { avatarLoaded = true; resolve(); };
        avatarImg.onerror = () => resolve();
        const url = creatorAvatarUrl.startsWith("/")
          ? `${window.location.origin}${creatorAvatarUrl}`
          : creatorAvatarUrl;
        avatarImg.src = url;
        setTimeout(resolve, 5000);
      });

      // Avatar circle
      const avatarSize = 320;
      const avatarX = W / 2;
      const avatarY = 540;

      // Glow ring
      ctx.save();
      const ringGrad = ctx.createLinearGradient(avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarX + avatarSize / 2, avatarY + avatarSize / 2);
      ringGrad.addColorStop(0, "#a855f7");
      ringGrad.addColorStop(1, "#06b6d4");
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarSize / 2 + 12, 0, Math.PI * 2);
      ctx.fillStyle = ringGrad;
      ctx.fill();

      // Shadow
      ctx.shadowColor = "#a855f780";
      ctx.shadowBlur = 60;
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#1a1030";
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Avatar image clipped
      if (avatarLoaded) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarSize / 2 - 4, 0, Math.PI * 2);
        ctx.clip();
        const imgSize = avatarSize - 8;
        ctx.drawImage(avatarImg, avatarX - imgSize / 2, avatarY - imgSize / 2, imgSize, imgSize);
        ctx.restore();
      } else {
        // Fallback: initials
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarSize / 2 - 4, 0, Math.PI * 2);
        ctx.fillStyle = "#a855f7";
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 100px 'Noto Sans KR', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(creatorName.slice(0, 2), avatarX, avatarY);
        ctx.restore();
      }

      // Creator name
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 72px 'Noto Sans KR', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Truncate name if too long
      let displayName = creatorName;
      while (ctx.measureText(displayName).width > W - 200 && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
      }
      if (displayName !== creatorName) displayName += "…";
      ctx.fillText(displayName, W / 2, 790);

      // Main text: "나는 000의"
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "500 48px 'Noto Sans KR', sans-serif";
      ctx.fillText(`나는 ${displayName}의`, W / 2, 920);

      // Big highlight: "상위 X% 서포터입니다"
      const percentGrad = ctx.createLinearGradient(200, 980, W - 200, 1060);
      percentGrad.addColorStop(0, "#a855f7");
      percentGrad.addColorStop(1, "#06b6d4");
      ctx.fillStyle = percentGrad;
      ctx.font = "900 80px 'Noto Sans KR', sans-serif";
      ctx.fillText(`상위 ${topPercent}% 서포터`, W / 2, 1020);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "500 48px 'Noto Sans KR', sans-serif";
      ctx.fillText("입니다 🔥", W / 2, 1100);

      // Divider line
      const divGrad = ctx.createLinearGradient(240, 0, W - 240, 0);
      divGrad.addColorStop(0, "transparent");
      divGrad.addColorStop(0.5, "#a855f780");
      divGrad.addColorStop(1, "transparent");
      ctx.strokeStyle = divGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(240, 1180);
      ctx.lineTo(W - 240, 1180);
      ctx.stroke();

      // Ranking box
      const boxW = 500;
      const boxH = 140;
      const boxX = (W - boxW) / 2;
      const boxY = 1230;
      
      // Box background
      ctx.fillStyle = "rgba(168, 85, 247, 0.12)";
      roundRect(ctx, boxX, boxY, boxW, boxH, 24);
      ctx.fill();
      ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
      ctx.lineWidth = 2;
      roundRect(ctx, boxX, boxY, boxW, boxH, 24);
      ctx.stroke();

      // Rank number
      ctx.fillStyle = "#a855f7";
      ctx.font = "900 56px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`🏆 현재 ${rank}위`, W / 2, boxY + boxH / 2);

      // Bottom Rankit logo area
      // "Rank⚡it" text logo
      ctx.textBaseline = "middle";
      const logoY = 1550;

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 64px 'Space Grotesk', Arial, sans-serif";
      ctx.textAlign = "center";
      const rankText = "Rank";
      const itText = "it";
      const rankW = ctx.measureText(rankText).width;
      const boltW = 50;
      const itW = ctx.measureText(itText).width;
      const totalW = rankW + boltW + itW;
      const startX = (W - totalW) / 2;

      ctx.fillText(rankText, startX + rankW / 2, logoY);
      
      // Lightning bolt
      ctx.fillStyle = "#06b6d4";
      ctx.font = "900 72px 'Space Grotesk', Arial, sans-serif";
      ctx.fillText("⚡", startX + rankW + boltW / 2, logoY - 2);

      ctx.fillStyle = "#a855f7";
      ctx.font = "300 64px 'Space Grotesk', Arial, sans-serif";
      ctx.fillText(itText, startX + rankW + boltW + itW / 2, logoY);

      // Tagline
      ctx.fillStyle = "#64748b";
      ctx.font = "400 30px 'Noto Sans KR', sans-serif";
      ctx.fillText("rankit.kr", W / 2, 1630);

      // Bottom decorative line
      ctx.strokeStyle = divGrad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(140, H - 200);
      ctx.lineTo(W - 140, H - 200);
      ctx.stroke();

      // "지금 나도 투표하러 가기" CTA
      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 32px 'Noto Sans KR', sans-serif";
      ctx.fillText("지금 나도 투표하러 가기 👉", W / 2, H - 140);

      const dataUrl = canvas.toDataURL("image/png");
      setImageDataUrl(dataUrl);
    } catch (e) {
      console.error(e);
      toast.error("카드 생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  }, [creatorName, creatorAvatarUrl, rank, topPercent]);

  const handleDownload = () => {
    if (!imageDataUrl) return;
    const a = document.createElement("a");
    a.href = imageDataUrl;
    a.download = `rankit-fan-cert-${creatorName}.png`;
    a.click();
    toast.success("팬 인증 카드가 저장되었습니다! 📸");
  };

  const handleShare = async () => {
    if (!imageDataUrl) return;
    try {
      const blob = await (await fetch(imageDataUrl)).blob();
      const file = new File([blob], `rankit-fan-cert-${creatorName}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${creatorName}의 팬 인증 카드`,
          text: `나는 ${creatorName}의 상위 ${topPercent}% 서포터! 🔥`,
          files: [file],
        });
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-[hsl(var(--neon-purple))] rounded-full opacity-10 blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-[hsl(var(--neon-cyan))] rounded-full opacity-10 blur-[80px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative w-full max-w-sm animate-scale-in">
        {/* Glow border */}
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-[hsl(var(--neon-purple))] via-[hsl(var(--neon-cyan)/0.3)] to-[hsl(var(--neon-purple)/0.5)] opacity-60 blur-[1px]" />

        <div className="relative rounded-2xl bg-[hsl(var(--glass))] border border-[hsl(var(--glass-border))] backdrop-blur-xl p-5 space-y-4 overflow-hidden">
          {/* Decorative */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[hsl(var(--neon-purple)/0.15)] to-transparent rounded-bl-full" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-[hsl(var(--muted)/0.5)] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted))] transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center space-y-1.5 pt-1">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-[hsl(var(--neon-cyan))]" />
              <h3 className="text-lg font-bold bg-gradient-to-r from-[hsl(var(--neon-purple))] to-[hsl(var(--neon-cyan))] bg-clip-text text-transparent">
                팬 인증 카드
              </h3>
              <Sparkles className="w-4 h-4 text-[hsl(var(--neon-purple))]" />
            </div>
            <p className="text-xs text-muted-foreground">인스타 스토리에 올려서 화력을 인증하세요! 🔥</p>
          </div>

          {/* Preview */}
          <div className="relative rounded-xl border border-[hsl(var(--glass-border))] bg-[hsl(var(--background)/0.5)] p-2 min-h-[200px] flex items-center justify-center overflow-hidden">
            {generating ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground py-8">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[hsl(var(--neon-purple)/0.2)] blur-md animate-pulse" />
                  <Loader2 className="relative w-8 h-8 animate-spin text-[hsl(var(--neon-purple))]" />
                </div>
                <span className="text-sm font-medium text-foreground/80">카드 생성 중... ✨</span>
              </div>
            ) : imageDataUrl ? (
              <img
                src={imageDataUrl}
                alt="팬 인증 카드"
                className="w-full rounded-lg shadow-lg shadow-[hsl(var(--neon-purple)/0.15)]"
              />
            ) : (
              <button
                onClick={generateCard}
                className="group relative px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--neon-purple))] to-[hsl(var(--neon-cyan))] opacity-90 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center gap-2 text-primary-foreground">
                  <Sparkles className="w-4 h-4" />
                  팬 인증 카드 만들기
                </span>
              </button>
            )}
          </div>

          {/* Action buttons */}
          {imageDataUrl && (
            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                className="flex-1 h-11 gradient-primary text-primary-foreground rounded-xl font-medium"
              >
                <Download className="w-4 h-4 mr-2" />
                저장하기
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                className="flex-1 h-11 rounded-xl border-[hsl(var(--neon-cyan)/0.3)] hover:border-[hsl(var(--neon-cyan)/0.6)]"
              >
                <Share2 className="w-4 h-4 mr-2 text-[hsl(var(--neon-cyan))]" />
                공유하기
              </Button>
            </div>
          )}

          {/* Tip */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-[hsl(var(--neon-purple)/0.1)] to-[hsl(var(--neon-cyan)/0.1)] border border-[hsl(var(--neon-purple)/0.2)]">
            <span className="text-base">💡</span>
            <span className="text-[11px] text-muted-foreground">인스타그램 스토리에 올리면 팬덤 화력 인증 완료!</span>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

// Helper: rounded rectangle
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default FanCertCard;
