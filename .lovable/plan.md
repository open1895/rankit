

## Creator Promotion 기능 구현 계획

### 1. DB Migration

`creators` 테이블에 5개 컬럼 추가:

```sql
ALTER TABLE public.creators
  ADD COLUMN is_promoted boolean NOT NULL DEFAULT false,
  ADD COLUMN promotion_type text NOT NULL DEFAULT 'none',
  ADD COLUMN promotion_start timestamptz,
  ADD COLUMN promotion_end timestamptz,
  ADD COLUMN promotion_status text NOT NULL DEFAULT 'none';
```

RLS: 기존 `creators` 정책으로 충분 (SELECT public, UPDATE owner only). 프로모션 신청은 `admin` Edge Function을 통해 서비스 역할로 처리.

### 2. Admin Edge Function 업데이트

`supabase/functions/admin/index.ts`에 3개 액션 추가:

- **`submit_promotion`**: 크리에이터 본인이 신청 (user_id 검증 후 `promotion_status='pending'`, `promotion_type` 설정)
- **`list_promotions`**: `promotion_status='pending'`인 크리에이터 목록 반환
- **`approve_promotion`**: `is_promoted=true`, `promotion_start=now()`, `promotion_end` 계산, `promotion_status='approved'`
- **`reject_promotion`**: `promotion_status='rejected'`, `is_promoted=false`

### 3. 새 컴포넌트: `PromotionRequestModal.tsx`

- 프로모션 타입 선택 (⭐ Featured / 🚀 Rising)
- 기간 선택 (24시간 / 3일 / 7일)
- 제출 시 `admin` Edge Function `submit_promotion` 호출
- 로그인 + 클레임된 크리에이터만 접근 가능

### 4. 새 컴포넌트: `FeaturedCreatorsSection.tsx`

- `creators` 테이블에서 `is_promoted=true AND promotion_type IN ('featured','homepage') AND promotion_end > now()` 쿼리
- 수평 스크롤 카드 리스트 (아바타, 이름, 카테고리, 순위, ⭐ 배지)
- `Index.tsx`의 `TrendingNowSection` 아래에 추가

### 5. `CreatorProfile.tsx` 수정

- 클레임된 본인 크리에이터에게 "프로필 홍보하기" 버튼 추가
- 활성 프로모션 시 ⭐ Featured / 🚀 Rising 배지 표시
- pending 상태 시 "심사 중" 표시

### 6. `RisingInfluenceCreators.tsx` 수정

`fetchRisingCreators`에서 `promotion_type='rising'` + 활성 프로모션 크리에이터를 결과 상단에 우선 배치

### 7. `AdminPanelPage.tsx` 수정

- 탭 타입에 `"promotions"` 추가
- `PromotionsTab` 컴포넌트 추가: pending 신청 목록 + 승인/거절 버튼
- 기존 탭 버튼 행에 "프로모션" 탭 추가

### 수정 파일 요약

| 파일 | 변경 |
|------|------|
| Migration (새 파일) | creators 프로모션 컬럼 5개 추가 |
| `supabase/functions/admin/index.ts` | submit/list/approve/reject promotion |
| `src/components/PromotionRequestModal.tsx` (새) | 신청 모달 |
| `src/components/FeaturedCreatorsSection.tsx` (새) | 홈페이지 Featured 섹션 |
| `src/pages/CreatorProfile.tsx` | 신청 버튼 + 배지 |
| `src/pages/Index.tsx` | FeaturedCreatorsSection import + 배치 |
| `src/pages/AdminPanelPage.tsx` | 프로모션 관리 탭 |
| `src/components/RisingInfluenceCreators.tsx` | 프로모션 우선 표시 |

