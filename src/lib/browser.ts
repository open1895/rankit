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
  const cleanUrl = url.replace(/^https?:\/\//, "");

  // Android intent scheme – specify browser category so OS shows browser picker
  if (/android/i.test(ua)) {
    // Try Chrome first if available
    const chromeIntent = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;
    
    // Generic browser intent as fallback
    const genericIntent = `intent://${cleanUrl}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;

    // For Naver app, use the generic intent (Chrome-specific may fail)
    if (/NAVER/i.test(ua)) {
      window.location.href = genericIntent;
    } else {
      window.location.href = chromeIntent;
    }
    
    // Fallback: if intent didn't work after 1s, try generic
    setTimeout(() => {
      window.location.href = genericIntent;
    }, 1000);
    
    return true;
  }

  // iOS – Safari universal link approach
  if (/iPhone|iPad|iPod/i.test(ua)) {
    // Try Safari scheme
    const safariUrl = `x-safari-https://${cleanUrl}`;
    window.location.href = safariUrl;
    
    // Fallback to window.open
    setTimeout(() => {
      const w = window.open(url, "_blank");
      if (!w) {
        // Last resort: copy URL approach handled by caller
      }
    }, 500);
    return true;
  }

  window.open(url, "_blank");
  return true;
}
