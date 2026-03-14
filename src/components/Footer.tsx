import { useState, useRef } from "react";
import { Link2 } from "lucide-react";
import { copyToClipboard, getPublishedUrl } from "@/lib/clipboard";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { PrivacyPolicyModal, TermsOfServiceModal } from "@/components/LegalModals";

const Footer = () => {
  const navigate = useNavigate();
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const handleCopyLink = async () => {
    const url = getPublishedUrl();
    const ok = await copyToClipboard(url);
    if (ok) {
      toast.success("링크가 복사되었습니다!");
    } else {
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  const handleCopyrightClick = () => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      navigate("/admin-panel");
      return;
    }
    clickTimerRef.current = setTimeout(() => { clickCountRef.current = 0; }, 2000);
  };

  return (
    <footer className="w-full bg-card border-t border-border mt-12 pb-16 md:pb-0">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <span className="font-bold text-lg tracking-tight text-foreground">Rankit</span>
          <span className="text-[11px] text-muted-foreground tracking-wide">The Creator Competition Platform</span>
        </div>

        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-border hover:border-primary/50 hover:text-primary transition-colors text-sm text-muted-foreground"
          aria-label="링크 복사"
        >
          <Link2 className="w-4 h-4" />
          링크 복사
        </button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <button onClick={() => setPrivacyOpen(true)} className="hover:text-foreground transition-colors underline-offset-2 hover:underline">
            개인정보 처리방침
          </button>
          <span>|</span>
          <button onClick={() => setTermsOpen(true)} className="hover:text-foreground transition-colors underline-offset-2 hover:underline">
            이용약관
          </button>
        </div>

        <a href="mailto:steelmind7777@naver.com" className="text-xs text-muted-foreground hover:text-primary transition-colors">
          steelmind7777@naver.com
        </a>

        <p
          className="text-xs text-muted-foreground text-center cursor-default select-none"
          onClick={handleCopyrightClick}
        >
          © 2026 Rankit. All rights reserved.
        </p>
      </div>

      <PrivacyPolicyModal open={privacyOpen} onOpenChange={setPrivacyOpen} />
      <TermsOfServiceModal open={termsOpen} onOpenChange={setTermsOpen} />
    </footer>
  );
};

export default Footer;
