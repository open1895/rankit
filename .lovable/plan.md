

## Creator Claim Profile 기능 구현 계획

### 현재 상태 분석

이미 구현된 것들:
- **ClaimCreatorModal**: 인증 코드(RANKIT-XXXX) 기반 자가 인증 플로우
- **CreatorDashboard**: 투표 통계, AI 인사이트, 팬 분석 차트
- **ShareCard**: 카카오톡/링크 공유 + 이미지 생성
- **RankitVerifiedBadge**: 인증 크리에이터 배지
- **claim-creator Edge Function**: 코드 생성 및 즉시 인증 처리
- **creators 테이블**: `user_id`, `is_verified` 컬럼으로 기본 인증 관리

### 추가/개선이 필요한 부분

현재는 인증 코드를 SNS에 게시하면 **즉시 승인**되는 구조입니다. 요청하신 기능은 **관리자 심사 기반 Claim 워크플로우**를 추가하는 것입니다.

---

### 구현 계획

#### 1. DB 스키마 확장 (Migration)

`creators` 테이블에 컬럼 추가:
- `claimed` (boolean, default false)
- `claimed_at` (timestamptz)
- `verification_status` (text, default 'none') — none / pending / verified / rejected
- `contact_email` (text)
- `instagram_handle` (text)
- `claim_message` (text) — 선택 메시지

> `claimed_user_id`는 기존 `user_id` 컬럼이 동일 역할을 하므로 재활용. `youtube_channel`은 기존 `youtube_channel_id`가 있으므로 생략.

#### 2. Claim Request Form 개선

기존 `ClaimCreatorModal`에 **간편 신청 폼 모드** 추가:
- 크리에이터 이름 (자동)
- 본인 이름, 이메일, Instagram 계정, YouTube 채널, 선택 메시지
- 제출 시 `verification_status = 'pending'` 설정
- 기존 코드 인증 방식도 유지 (탭 전환)

#### 3. claim-creator Edge Function 확장

- 새 action `submit_claim_request` 추가
- 폼 데이터를 `creators` 테이블의 새 컬럼에 저장
- `verification_status = 'pending'` 설정
- 관리자에게 알림(notifications 테이블) 발송

#### 4. Admin Panel — Claim 심사 탭

`AdminPanelPage.tsx`에 **"크리에이터 인증 요청"** 탭 추가:
- `verification_status = 'pending'`인 크리에이터 목록 표시
- 각 항목에 신청자 정보(이름, 이메일, Instagram, 메시지) 표시
- **승인**: `claimed=true`, `verification_status='verified'`, `is_verified=true`, `claimed_at=now()`
- **거절**: `verification_status='rejected'`, `user_id=null`
- admin Edge Function에 approve/reject 액션 추가

#### 5. 프로필 페이지 배지 & 상태 표시

- `verification_status === 'verified'` → 기존 RankitVerifiedBadge 표시 (이미 구현됨)
- `verification_status === 'pending'` → "인증 심사 중" 상태 텍스트 표시
- `verification_status === 'rejected'` → 재신청 가능하도록 버튼 다시 표시

#### 6. Creator Dashboard & Share (이미 구현됨)

CreatorDashboard와 ShareCard는 이미 완성되어 있으므로 추가 작업 불필요. 인증 승인 시 자동으로 대시보드 접근 권한이 활성화됩니다.

---

### 수정 파일 목록

| 파일 | 변경 |
|------|------|
| `migration (새 파일)` | creators 테이블 컬럼 추가 |
| `supabase/functions/claim-creator/index.ts` | submit_claim_request 액션 추가 |
| `supabase/functions/admin/index.ts` | approve/reject claim 액션 추가 |
| `src/components/ClaimCreatorModal.tsx` | 간편 신청 폼 탭 추가 |
| `src/pages/AdminPanelPage.tsx` | 인증 요청 심사 탭 추가 |
| `src/pages/CreatorProfile.tsx` | pending/rejected 상태 UI 반영 |

### 핵심 보안

- Claim 신청은 로그인 사용자만 가능 (기존 auth 검증 유지)
- 승인/거절은 admin role 검증 필수
- 이메일/연락처는 관리자만 조회 가능 (RLS)

