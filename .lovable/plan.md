

## 인앱 브라우저 구글 로그인 차단 대응

### 문제
네이버, 카카오톡, Instagram 등 앱 내장 브라우저(WebView)에서 Google OAuth 시도 시 `403: disallowed_useragent` 에러 발생. Google 정책상 WebView에서의 OAuth가 차단됨.

### 해결 방안

**1. WebView 감지 유틸리티 함수 생성** (`src/lib/browser.ts`)
- User-Agent 문자열을 분석하여 인앱 브라우저 여부를 판별
- 감지 대상: NAVER, KakaoTalk, Instagram, Facebook, Line, Twitter 등 한국에서 주로 사용되는 앱

**2. Auth 페이지에서 WebView 감지 시 안내 표시** (`src/pages/Auth.tsx`)
- 인앱 브라우저 감지 시 Google 로그인 버튼 위에 경고 배너 표시
- 안내 메시지: "인앱 브라우저에서는 Google 로그인이 제한됩니다. Safari/Chrome에서 열어주세요."
- "외부 브라우저로 열기" 버튼 제공 → 현재 URL을 외부 브라우저로 오픈 시도
- Google 버튼 클릭 시에도 WebView면 toast로 안내 후 차단

### 기술 상세

```text
WebView 감지 로직 (User-Agent 기반):
- NAVER: "NAVER" 포함
- KakaoTalk: "KAKAOTALK" 포함  
- Instagram: "Instagram" 포함
- Facebook: "FBAN" 또는 "FBAV" 포함
- Line: "Line/" 포함
- 기타: "wv" (Android WebView), "WebView" 등
```

**외부 브라우저 열기 방법:**
- Android: `intent://` scheme 사용
- iOS: 직접 열기 어려우므로 URL 복사 안내
- Fallback: URL 복사 버튼 + "복사한 주소를 브라우저에 붙여넣기 해주세요" 안내

### 변경 파일
- `src/lib/browser.ts` — 신규: WebView 감지 유틸리티
- `src/pages/Auth.tsx` — 수정: WebView 감지 배너 및 Google 버튼 분기 처리

