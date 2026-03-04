import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Share2, Copy, Gift, Check, Users, Coins, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard, getPublishedOrigin } from "@/lib/clipboard";
import { shareToKakao, initKakao } from "@/lib/kakao";

const ReferralSystem = () => {
  const [myCode, setMyCode] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [bonusVotes, setBonusVotes] = useState(0);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    initKakao();
    const savedCode = localStorage.getItem("referral_code");
    if (savedCode) {
      setMyCode(savedCode);
      fetchBonus(savedCode);
    }
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

  const inviteLink = `${getPublishedOrigin()}?ref=${myCode}`;

  const copyLink = async () => {
    const ok = await copyToClipboard(inviteLink);
    setCopied(true);
    if (ok) {
      toast.success("초대 링크가 복사되었습니다!");
    } else {
      toast.error("복사에 실패했습니다.");
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Rank It - 크리에이터 투표",
          text: "친구가 투표하면 나도 추가 투표권을 받아요! 🎉",
          url: inviteLink,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  const shareKakao = () => {
    shareToKakao({
      title: "Rankit에 초대합니다! 🎉",
      description: "가입하면 5 RP 보너스! 함께 크리에이터를 응원해요!",
      webUrl: inviteLink,
      mobileWebUrl: inviteLink,
      buttonTitle: "초대 수락하기",
    });
  };

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4 text-[hsl(var(--neon-purple))]" />
        <h3 className="text-sm font-semibold">🎁 친구 초대하고 보상 받기</h3>
      </div>

      {/* Reward info banner */}
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-sm p-2.5 rounded-xl text-center space-y-1">
          <div className="flex items-center justify-center gap-1">
            <Users className="w-3.5 h-3.5 text-[hsl(var(--neon-purple))]" />
            <span className="text-[10px] text-muted-foreground">초대자 보상</span>
          </div>
          <div className="text-sm font-bold text-[hsl(var(--neon-purple))]">+10 RP</div>
        </div>
        <div className="glass-sm p-2.5 rounded-xl text-center space-y-1">
          <div className="flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--neon-cyan))]" />
            <span className="text-[10px] text-muted-foreground">신규 유저 보상</span>
          </div>
          <div className="text-sm font-bold text-[hsl(var(--neon-cyan))]">+5 RP</div>
        </div>
      </div>

      {myCode ? (
        <div className="space-y-3">
          <div className="glass-sm p-3 text-center space-y-1">
            <div className="text-[10px] text-muted-foreground">내 초대 코드</div>
            <div className="text-lg font-bold bg-gradient-to-r from-[hsl(var(--neon-purple))] to-[hsl(var(--neon-cyan))] bg-clip-text text-transparent tracking-widest">{myCode}</div>
            {bonusVotes > 0 && (
              <div className="flex items-center justify-center gap-1 text-xs text-[hsl(var(--neon-cyan))]">
                <Coins className="w-3 h-3" />
                {bonusVotes}장의 보너스 투표권 획득!
              </div>
            )}
          </div>

          {/* Share buttons grid */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={copyLink}
              className="glass-sm p-2.5 flex flex-col items-center justify-center gap-1 text-xs font-medium hover:border-[hsl(var(--neon-cyan)/0.5)] transition-all rounded-xl"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-[hsl(var(--neon-cyan))]" />}
              <span className="text-[10px]">{copied ? "복사됨!" : "링크 복사"}</span>
            </button>
            <button
              onClick={shareKakao}
              className="glass-sm p-2.5 flex flex-col items-center justify-center gap-1 text-xs font-medium hover:border-yellow-500/50 transition-all rounded-xl"
            >
              <span className="text-sm">💬</span>
              <span className="text-[10px]">카카오톡</span>
            </button>
            <button
              onClick={shareLink}
              className="glass-sm p-2.5 flex flex-col items-center justify-center gap-1 text-xs font-medium hover:border-[hsl(var(--neon-purple)/0.5)] transition-all rounded-xl"
            >
              <Share2 className="w-3.5 h-3.5 text-[hsl(var(--neon-purple))]" />
              <span className="text-[10px]">공유하기</span>
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            친구가 초대 링크로 가입하면 서로 보상을 받아요!
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
            className="w-full px-3 py-2 rounded-xl glass-sm bg-card/30 border border-[hsl(var(--glass-border))] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[hsl(var(--neon-purple)/0.5)] transition-colors"
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
