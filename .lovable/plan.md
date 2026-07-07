# 랭킷 3대 개선 작업 계획

작업은 1 → 2 → 3 순서로 진행하고, 각 단계 완료 시 변경 컴포넌트 목록을 보고합니다.

---

## 1단계. 빈 콘텐츠 숨김 처리 (Empty State 큐레이션)

**대상 파일 / 변경 내용**

- `src/components/PopularPosts.tsx`
  - `likes + comments_count === 0`인 게시글 필터 제외
  - 노출 가능 게시글 < 3개 → 리스트 대신 CTA 카드("아직 활동이 적어요, 첫 글을 남겨보세요" + `/community` 이동 버튼) 렌더
- `src/components/HomePredictionSection.tsx` (및 `src/pages/PredictionGame.tsx`)
  - 이벤트 목록 정렬: `total_bets > 0` 우선, 0인 항목은 하단으로
  - 노출 가능 이벤트 0개 → 섹션 자체 숨김(`return null`)
- `src/components/FandomTournament.tsx`
  - 각 참가 팬덤의 활동 점수 < 10 → "진행 중" 배지 대신 "모집 중" 배지 표시(색상: amber)
- `src/components/creator-profile/OverviewTab.tsx`
  - `total_subscribers === 0 && activity_score === 0 && fanclub_members === 0` 시
    숫자 카드 대신 안내 배너("신규 크리에이터입니다 — 첫 투표를 응원해주세요!")
- `src/components/AICreatorInsights.tsx`
  - 모든 인사이트가 부정형(`type === 'negative'` 또는 하락 키워드)일 경우
    긍정형 제안 1개 자동 삽입("팬클럽 초대 링크를 공유해보세요" 등 라운드 로빈 기본 문구 배열에서 선택)

---

## 2단계. 배틀 무승부 로직 수정

**DB 마이그레이션**
- `battles.status` 값에 `'cancelled'` 허용(제약이 있으면 완화). 서버측 자동 종료 로직에서 `votes_a = 0 AND votes_b = 0` → `status = 'cancelled'`, `winner_id = NULL` 로 기록.
- 관련 edge function: `supabase/functions/generate-battles/index.ts` 및 배틀 마감 처리 지점(있으면) 업데이트

**클라이언트 변경**
- `src/components/BattleHistory.tsx`
  - `status = 'cancelled'` 배틀: "투표 부족으로 취소됨" 라벨로 표시, 승/무 배지 숨김
- `src/components/creator-profile/BattleRecord.tsx`
  - 승/패/무 집계에서 `cancelled` 제외 → 승률 계산 정정
- `src/components/CreatorBattleSection.tsx` (진행 중 배틀 카드)
  - `votes_a + votes_b < 5` 이고 상태 `active` → "투표 진행 중 — N표 더 필요" 배지 노출

---

## 3단계. 핵심 기능 축소 (플래그 기반 노출 제어)

**중앙 플래그**
- `src/config/features.ts`에 UI 노출 플래그 추가 (기본 OFF):
  ```ts
  ENABLE_PREDICTION: false,
  ENABLE_FAN_LEADERBOARD: false,
  ENABLE_HALL_OF_FAME: false,
  ENABLE_POWER_BOOST: false,
  ENABLE_WIDGET_EMBED: false,
  ENABLE_WEEKLY_PDF: false,
  ENABLE_PROFILE_ANALYTICS_TAB: false,
  ENABLE_PROFILE_COMMUNITY_TAB: false,
  ```
- 라우팅/네비/홈은 코드 삭제 없이 `FEATURES.X && ...` 조건부 렌더만 적용
  (라우트 자체는 그대로 두되 네비 진입점만 숨김 — URL 직입력 시 접근은 유지)

**적용 파일**
- `src/components/MobileTabBar.tsx`, `src/components/DesktopNavBar.tsx`
  - 기본 노출: 홈(투표/랭킹), 배틀, 마이(로그인 시)
  - 예측/탑팬/명예의 전당 등 플래그 OFF 시 숨김
- `src/pages/Index.tsx` / `src/components/HomepageSections.tsx`
  - `HomePredictionSection`, `TopFandomWidget`, `FeaturedChampion(명예의전당)`, `PowerBoostCard` 등 플래그 조건부 렌더
- `src/pages/CreatorProfile.tsx`
  - 탭 목록을 플래그 기반 필터: 기본은 개요/팬 2개
  - 분석/커뮤니티 탭은 `ENABLE_PROFILE_ANALYTICS_TAB`, `ENABLE_PROFILE_COMMUNITY_TAB`로 제어
- `src/components/CreatorDashboard.tsx` / 위젯 진입점 / 주간 PDF 버튼
  - `ENABLE_WIDGET_EMBED`, `ENABLE_WEEKLY_PDF` 조건부

**복원성**: 모든 컴포넌트/라우트/DB 로직은 유지. 플래그를 true로 바꾸면 즉시 복구.

---

## 기술 노트

- 3단계는 UI 표면만 건드리고 API/DB/edge function은 무손실
- 2단계만 DB 마이그레이션 1건(제약 완화 + cancelled 처리) 필요 → 사용자 승인 후 진행
- 각 단계 종료 시 변경 파일 리스트를 사용자에게 보고
