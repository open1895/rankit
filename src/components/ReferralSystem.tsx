import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Share2, Copy, Gift, Check } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard, getPublishedOrigin } from "@/lib/clipboard";

const ReferralSystem = () => {
  const [myCode, setMyCode] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [bonusVotes, setBonusVotes] = useState(0);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedCode = localStorage.getItem("referral_code");
    if (savedCode) {
      setMyCode(savedCode);
      fetchBonus(savedCode);
    }
    // Check if user came from a referral
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("pending_referral", ref);
    }
  }, []);

  const fetchBonus = async (code: string) => {
    const { data } = await supabase
      .from("referral_codes")
      .select("bonus_votes_earned")
      .eq("code", code)
      .limit(1);
    if (data && data.length > 0) {
      setBonusVotes(data[0].bonus_votes_earned);
    }
  };

  const generateCode = async () => {
    if (!nickname.trim() || nickname.length < 2) {
      toast.error("닉네임을 2글자 이상 입력해주세요.");
      return;
    }
    setCreating(true);
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { error } = await supabase.from("referral_codes").insert({
      code,
      nickname: nickname.trim(),
    });

    if (error) {
      toast.error("코드 생성에 실패했습니다.");
      setCreating(false);
      return;
    }

    localStorage.setItem("referral_code", code);
    setMyCode(code);
    setCreating(false);
    toast.success("초대 코드가 생성되었습니다! 🎉");
  };

  const copyLink = async () => {
    const link = `${getPublishedOrigin()}?ref=${myCode}`;
    const ok = await copyToClipboard(link);
    setCopied(true);
    if (ok) {
      toast.success("초대 링크가 복사되었습니다!");
    } else {
      toast.error("복사에 실패했습니다.");
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    const link = `${getPublishedOrigin()}?ref=${myCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Rank It - 크리에이터 투표",
          text: "친구가 투표하면 나도 추가 투표권을 받아요! 🎉",
          url: link,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4 text-neon-purple" />
        <h3 className="text-sm font-semibold">🎁 친구 초대하고 투표권 받기</h3>
      </div>

      {myCode ? (
        <div className="space-y-3">
          <div className="glass-sm p-3 text-center space-y-1">
            <div className="text-[10px] text-muted-foreground">내 초대 코드</div>
            <div className="text-lg font-bold gradient-text tracking-widest">{myCode}</div>
            {bonusVotes > 0 && (
              <div className="text-xs text-neon-cyan">
                🎉 {bonusVotes}장의 보너스 투표권 획득!
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="flex-1 glass-sm p-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-neon-cyan hover:border-neon-cyan/50 transition-all rounded-xl"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "복사됨!" : "링크 복사"}
            </button>
            <button
              onClick={shareLink}
              className="flex-1 glass-sm p-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-neon-purple hover:border-neon-purple/50 transition-all rounded-xl"
            >
              <Share2 className="w-3.5 h-3.5" />
              공유하기
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            친구가 초대 링크로 투표하면 투표권 3장을 받아요!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임 입력 (2글자 이상)"
            maxLength={20}
            className="w-full px-3 py-2 rounded-xl glass-sm bg-card/30 border border-glass-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-purple/50 transition-colors"
          />
          <button
            onClick={generateCode}
            disabled={creating}
            className="w-full gradient-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {creating ? "생성 중..." : "초대 코드 만들기"}
          </button>
          <p className="text-[10px] text-muted-foreground text-center">
            초대 코드를 만들고 친구에게 공유하세요!
          </p>
        </div>
      )}
    </div>
  );
};

export default ReferralSystem;
