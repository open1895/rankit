import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Share2, Download, Copy, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareCardProps {
  creatorId: string;
  creatorName: string;
  onClose: () => void;
}

const ShareCard = ({ creatorId, creatorName, onClose }: ShareCardProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const generateCard = async () => {
    setLoading(true);
    setError(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-share-card", {
        body: { creator_id: creatorId },
      });

      if (fnError || data?.error) {
        throw new Error(data?.error || fnError?.message);
      }

      setImageUrl(data.image_url);
    } catch (err: any) {
      console.error(err);
      setError(true);
      toast.error("공유 카드 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = `${window.location.origin}/creator/${creatorId}`;
  const shareText = `${creatorName}에게 투표했어요! 🏆 Rank It에서 확인하세요!`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("링크가 복사되었습니다!");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Rank It - ${creatorName}`, text: shareText, url: shareUrl });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(shareText);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const handleShareKakao = () => {
    window.open(`https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rankit-${creatorName}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("이미지가 다운로드되었습니다!");
    } catch {
      toast.error("다운로드에 실패했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-sm p-5 space-y-4 relative">
        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold gradient-text">SNS 공유하기</h3>
          <p className="text-xs text-muted-foreground">{creatorName}의 순위를 공유하세요!</p>
        </div>

        {/* Card Preview */}
        <div className="glass-sm p-3 min-h-[160px] flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-neon-purple" />
              <span className="text-xs">카드 생성 중...</span>
            </div>
          ) : imageUrl ? (
            <img src={imageUrl} alt="Share card" className="w-full rounded-lg" />
          ) : error ? (
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">카드 생성에 실패했습니다</p>
              <Button variant="outline" size="sm" onClick={generateCard}>
                다시 시도
              </Button>
            </div>
          ) : (
            <Button
              onClick={generateCard}
              className="gradient-primary text-primary-foreground rounded-xl hover:opacity-90"
            >
              <Share2 className="w-4 h-4 mr-2" />
              공유 카드 생성하기
            </Button>
          )}
        </div>

        {/* Actions */}
        {imageUrl && (
          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="flex-1 glass-sm border-glass-border"
            >
              <Download className="w-4 h-4 mr-1" />
              저장
            </Button>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              size="sm"
              className="flex-1 glass-sm border-glass-border"
            >
              <Copy className="w-4 h-4 mr-1" />
              링크 복사
            </Button>
          </div>
        )}

        {/* Social Share Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleNativeShare}
            className="glass-sm p-3 text-center text-sm font-medium hover:border-neon-cyan/50 transition-all rounded-xl"
          >
            📲 공유하기
          </button>
          <button
            onClick={handleShareTwitter}
            className="glass-sm p-3 text-center text-sm font-medium hover:border-neon-cyan/50 transition-all rounded-xl"
          >
            𝕏 트위터
          </button>
          <button
            onClick={handleShareKakao}
            className="glass-sm p-3 text-center text-sm font-medium hover:border-neon-purple/50 transition-all rounded-xl"
          >
            💬 카카오
          </button>
          <button
            onClick={handleShareFacebook}
            className="glass-sm p-3 text-center text-sm font-medium hover:border-neon-cyan/50 transition-all rounded-xl"
          >
            📘 페이스북
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareCard;
