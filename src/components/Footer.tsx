import { Link2 } from "lucide-react";
import { copyToClipboard, getPublishedUrl } from "@/lib/clipboard";
import { toast } from "sonner";

const Footer = () => {
  const handleCopyLink = async () => {
    const url = getPublishedUrl();
    const ok = await copyToClipboard(url);
    if (ok) {
      toast.success("링크가 복사되었습니다!");
    } else {
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  return (
    <footer className="w-full bg-black text-gray-400 mt-12">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg tracking-tight">Creator Pulse</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-neon-cyan font-semibold">Rankit</span>
        </div>

        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-700 hover:border-neon-cyan/50 hover:text-neon-cyan transition-colors text-sm"
          aria-label="링크 복사"
        >
          <Link2 className="w-4 h-4" />
          링크 복사
        </button>

        <a href="mailto:steelmind7777@naver.com" className="text-xs text-gray-500 hover:text-neon-cyan transition-colors">
          steelmind7777@naver.com
        </a>

        <p className="text-xs text-gray-500 text-center">
          © 2026 Creator Pulse. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
