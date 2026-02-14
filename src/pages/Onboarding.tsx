import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Upload, Zap, ArrowLeft, Camera, Check } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "게임", emoji: "🎮" },
  { value: "먹방", emoji: "🍔" },
  { value: "뷰티", emoji: "💄" },
  { value: "음악", emoji: "🎵" },
  { value: "일상", emoji: "📷" },
  { value: "교육", emoji: "📚" },
  { value: "테크", emoji: "💻" },
  { value: "스포츠", emoji: "⚽" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [channelLink, setChannelLink] = useState("");
  const [subscriberCount, setSubscriberCount] = useState("");
  const [category, setCategory] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-glass-border">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-neon-purple" />
            <span className="text-lg font-bold gradient-text">크리에이터 등록</span>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-1.5 glass-sm px-3 py-1 text-xs font-medium text-neon-cyan">
            <Zap className="w-3 h-3" />
            30초 빠른 등록
          </div>
          <h2 className="text-2xl font-bold">
            <span className="gradient-text">Rank It</span>에 참여하세요
          </h2>
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

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">카테고리 *</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-all ${
                    category === cat.value
                      ? "glass neon-glow-purple border-neon-purple/50 text-foreground"
                      : "glass-sm text-muted-foreground hover:text-foreground hover:border-glass-border"
                  }`}
                >
                  <span className="text-lg">{cat.emoji}</span>
                  <span>{cat.value}</span>
                  {category === cat.value && (
                    <Check className="w-3 h-3 text-neon-purple" />
                  )}
                </button>
              ))}
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
