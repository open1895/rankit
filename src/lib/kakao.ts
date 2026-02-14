// Kakao SDK utility
// Replace with your Kakao JavaScript App Key from https://developers.kakao.com
const KAKAO_JS_KEY = "YOUR_KAKAO_JS_KEY";

declare global {
  interface Window {
    Kakao: any;
  }
}

let initialized = false;

export function initKakao() {
  if (initialized) return true;
  if (!window.Kakao) return false;
  if (KAKAO_JS_KEY === "YOUR_KAKAO_JS_KEY") {
    console.warn("Kakao JS Key가 설정되지 않았습니다.");
    return false;
  }
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(KAKAO_JS_KEY);
  }
  initialized = true;
  return true;
}

export function isKakaoReady() {
  return initialized && window.Kakao?.isInitialized();
}

interface KakaoShareOptions {
  title: string;
  description: string;
  imageUrl?: string;
  webUrl: string;
  mobileWebUrl: string;
  buttonTitle?: string;
}

export function shareToKakao(options: KakaoShareOptions) {
  if (!isKakaoReady()) {
    // Fallback: open Kakao Story share
    window.open(
      `https://story.kakao.com/share?url=${encodeURIComponent(options.webUrl)}`,
      "_blank"
    );
    return;
  }

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: options.title,
      description: options.description,
      imageUrl: options.imageUrl || `${window.location.origin}/og-image.png`,
      link: {
        webUrl: options.webUrl,
        mobileWebUrl: options.mobileWebUrl,
      },
    },
    buttons: [
      {
        title: options.buttonTitle || "투표하러 가기",
        link: {
          webUrl: options.webUrl,
          mobileWebUrl: options.mobileWebUrl,
        },
      },
    ],
  });
}
