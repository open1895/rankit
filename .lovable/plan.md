
## 랭킷 토너먼트 완전 자동화 시스템

### Phase 1: 데이터베이스 스키마 변경
- `tournaments` 테이블에 `category`, `season_number`, `current_round`, `champion_creator_id`, `start_at`, `end_at` 컬럼 추가
- `tournament_matches` 테이블에 `status`, `start_at`, `end_at` 컬럼 추가 (기존 `is_completed` → `status` 전환)
- 새 테이블: `tournament_participants` (tournament_id, creator_id, seed, selection_score)
- 새 테이블: `tournament_logs` (tournament_id, log_type, message)
- `tournament_matches`의 `winner_id` → 유지 (이미 존재)

### Phase 2: Edge Function - 토너먼트 자동 생성
- `generate-weekly-tournaments` 리팩토링
- 크리에이터 자동 선발 (scoring 알고리즘)
- 매치 자동 생성 (seed 기반 대진)
- 참가자 저장 + 매치 생성 + 활성화를 원자적으로 처리
- 자동 진행 로직 (라운드 완료 시 다음 라운드 생성)

### Phase 3: Edge Function - 토너먼트 진행
- `tournament-vote` 수정: 투표 후 매치 완료 체크 → 라운드 완료 시 다음 라운드 자동 생성
- 타이브레이커 로직

### Phase 4: UI 업데이트
- Tournament 페이지: 빈 상태 제거, LIVE 배지, 진행률 바
- 홈 토너먼트 섹션 업데이트
- 관리자 패널: 토너먼트 수동 생성/관리

### Phase 5: 크론 스케줄
- 매주 월요일 09:00 KST 자동 실행
