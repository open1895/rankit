

## 크리에이터 YouTube 프로필 사진 자동 크롤링 계획

### 접근 방식

Firecrawl 커넥터를 연결하고, 각 크리에이터의 YouTube 채널 페이지를 스크래핑하여 프로필 이미지 URL을 추출한 뒤 DB에 저장합니다.

### 구현 단계

#### 1. Firecrawl 커넥터 연결
- `standard_connectors--connect`로 Firecrawl 커넥터 설정
- Edge Function에서 `FIRECRAWL_API_KEY` 환경변수로 접근 가능

#### 2. Edge Function 생성: `fetch-creator-avatars`
- `creators` 테이블에서 `channel_link`가 있는 크리에이터 목록 조회
- 각 YouTube 채널 URL을 Firecrawl scrape API로 호출 (screenshot 또는 branding format 사용)
- 응답에서 프로필 이미지 URL(og:image 또는 브랜딩 데이터의 logo) 추출
- `creators.avatar_url`을 추출된 이미지 URL로 업데이트
- 80명 크리에이터를 배치 처리 (rate limit 고려하여 순차 처리)

#### 3. Admin 패널에 "사진 가져오기" 버튼 추가
- `AdminPanelPage.tsx`에 버튼 추가
- 클릭 시 `fetch-creator-avatars` Edge Function 호출
- 진행 상태 표시

### 수정 파일

| 파일 | 변경 |
|------|------|
| `supabase/functions/fetch-creator-avatars/index.ts` (새) | YouTube 채널 스크래핑 + avatar_url 업데이트 |
| `src/pages/AdminPanelPage.tsx` | "사진 가져오기" 버튼 추가 |

### 주의사항
- Firecrawl의 `branding` format을 사용하면 로고/파비콘을 자동 추출 가능
- YouTube 채널 페이지의 og:image 메타태그에서 프로필 사진 획득 가능
- 외부 이미지 URL을 직접 `avatar_url`에 저장 (스토리지 업로드 없이)

