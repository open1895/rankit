const IN_APP_PATTERNS = [
  /NAVER/i,
  /KAKAOTALK/i,
  /Instagram/i,
  /FBAN|FBAV/i,
  /Line\//i,
  /Twitter/i,
  /DaumApps/i,
  /SamsungBrowser\/.*CrossApp/i,
  /\bwv\b/,
  /WebView/i,
];

export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return IN_APP_PATTERNS.some((p) => p.test(ua));
}

export function getInAppBrowserName(): string | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/NAVER/i.test(ua)) return "네이버";
  if (/KAKAOTALK/i.test(ua)) return "카카오톡";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV/i.test(ua)) return "Facebook";
  if (/Line\//i.test(ua)) return "Line";
  if (/Twitter/i.test(ua)) return "Twitter";
  if (/DaumApps/i.test(ua)) return "다음";
  if (/\bwv\b/i.test(ua) || /WebView/i.test(ua)) return "인앱 브라우저";
  return null;
}

export function openInExternalBrowser(url: string): boolean {
  const ua = navigator.userAgent;

  // Android intent scheme
  if (/android/i.test(ua)) {
    const intentUrl = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;end`;
    window.location.href = intentUrl;
    return true;
  }

  // iOS – try window.open (works in some apps), fallback handled by caller
  if (/iPhone|iPad|iPod/i.test(ua)) {
    const w = window.open(url, "_blank");
    return !!w;
  }

  window.open(url, "_blank");
  return true;
}
