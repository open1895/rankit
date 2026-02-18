import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Zap, ArrowLeft, Camera, Check, ChevronDown } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import RankitLogo from "@/components/RankitLogo";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "게임", emoji: "🎮", sub: ["게임", "게임/스트리밍"] },
  { value: "먹방/요리", emoji: "🍽️", sub: ["먹방/요리"] },
  { value: "뷰티/패션", emoji: "💄", sub: ["뷰티/패션"] },
  { value: "음악/커버", emoji: "🎵", sub: ["음악/커버"] },
  { value: "fitness/운동", emoji: "💪", sub: ["fitness/운동"] },
  { value: "여행/브이로그", emoji: "✈️", sub: ["여행/브이로그"] },
  { value: "테크/코딩", emoji: "💻", sub: ["테크/코딩"] },
  { value: "교육/독서", emoji: "📚", sub: ["교육/독서"] },
  { value: "댄스/퍼포먼스", emoji: "💃", sub: ["댄스/퍼포먼스"] },
  { value: "아트/일러스트", emoji: "🎨", sub: ["아트/일러스트"] },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [channelLink, setChannelLink] = useState("");
  const [subscriberCount, setSubscriberCount] = useState("");
  const [category, setCategory] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("크리에이터 등록은 로그인 후 이용 가능합니다.");
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedCategoryObj = CATEGORIES.find((c) => c.value === category);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("이미지 크기는 2MB 이하여야 합니다.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !channelLink.trim() || !category) {
      toast.error("모든 필수 항목을 입력해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      let avatarUrl = "";

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
        avatarUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("creators").insert({
        name: name.trim(),
        channel_link: channelLink.trim(),
        category,
        avatar_url: avatarUrl,
        subscriber_count: parseInt(subscriberCount) || 0,
        user_id: user.id,
      });

      if (error) throw error;

      toast.success("등록 완료! 🎉 랭킹에서 확인하세요.");
      navigate("/");
    } catch (err: any) {
      console.error(err);
      toast.error("등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = name.trim() && channelLink.trim() && category;

  return (
    <div className="min-h-screen bg-background mesh-bg">
      <SEOHead title="크리에이터 등록" description="Rank It에 크리에이터로 등록하고 팬들의 투표를 받아보세요!" path="/onboarding" noIndex />
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <RankitLogo size="sm" />
            <span className="text-sm text-muted-foreground font-medium">크리에이터 등록</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-1.5 glass-sm px-3 py-1 text-xs font-medium text-neon-cyan">
            <Zap className="w-3 h-3" />
            30초 빠른 등록
          </div>
          <div className="flex justify-center">
            <RankitLogo size="lg" />
          </div>
          <h2 className="text-xl font-bold text-foreground">에 참여하세요</h2>
          <p className="text-sm text-muted-foreground">
            등록만 하면 팬들의 투표를 받을 수 있어요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full glass border-2 border-dashed border-glass-border hover:border-neon-purple/50 transition-colors overflow-hidden group"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground group-hover:text-neon-purple transition-colors">
                  <Camera className="w-6 h-6" />
                  <span className="text-[10px] mt-1">프로필</span>
                </div>
              )}
              {avatarPreview && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="w-5 h-5 text-foreground" />
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <span className="text-xs text-muted-foreground">프로필 사진 (선택)</span>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">채널 이름 *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 코딩하는 거니"
              maxLength={50}
              className="glass-sm bg-card/30 border-glass-border focus:border-neon-purple/50"
            />
          </div>

          {/* Channel Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">채널 링크 *</label>
            <Input
              value={channelLink}
              onChange={(e) => setChannelLink(e.target.value)}
              placeholder="https://youtube.com/@channel"
              maxLength={300}
              className="glass-sm bg-card/30 border-glass-border focus:border-neon-purple/50"
            />
          </div>

          {/* Subscriber Count */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">구독자 수</label>
            <Input
              type="number"
              value={subscriberCount}
              onChange={(e) => setSubscriberCount(e.target.value)}
              placeholder="예: 150000"
              min={0}
              className="glass-sm bg-card/30 border-glass-border focus:border-neon-purple/50"
            />
            <p className="text-[10px] text-muted-foreground">영향력 지수에 40% 반영됩니다</p>
          </div>

          {/* Category Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">카테고리 *</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl glass-sm bg-card/30 border text-sm transition-colors ${
                  showCategoryDropdown
                    ? "border-neon-purple/50"
                    : "border-glass-border"
                } ${category ? "text-foreground" : "text-muted-foreground"}`}
              >
                <span>
                  {selectedCategoryObj
                    ? `${selectedCategoryObj.emoji} ${selectedCategoryObj.value}`
                    : "카테고리를 선택하세요"}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`} />
              </button>

              {showCategoryDropdown && (
                <div className="absolute z-50 mt-2 w-full rounded-xl bg-card border border-glass-border shadow-xl shadow-background/50 overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setCategory(cat.value);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                          category === cat.value
                            ? "bg-neon-purple/20 text-neon-purple"
                            : "text-foreground hover:bg-card/80"
                        }`}
                      >
                        <span className="text-lg">{cat.emoji}</span>
                        <span className="flex-1 text-left">{cat.value}</span>
                        {category === cat.value && <Check className="w-4 h-4 text-neon-purple" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={!isValid || submitting}
            className="w-full h-12 text-base font-bold gradient-primary text-primary-foreground rounded-xl neon-glow-purple hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                등록 중...
              </div>
            ) : (
              "🚀 랭킹에 참여하기"
            )}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default Onboarding;
