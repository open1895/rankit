import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const PRIVACY_POLICY = `
제1조 (목적)
본 개인정보 처리방침은 Rankit(이하 "회사")이 운영하는 크리에이터 영향력 랭킹 플랫폼(이하 "서비스")에서 이용자의 개인정보를 어떻게 수집, 이용, 보관, 파기하는지에 대한 사항을 규정합니다.

제2조 (수집하는 개인정보 항목)
회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다.
- 필수 항목: 이메일 주소, 닉네임
- 자동 수집 항목: IP 주소, 방문 일시, 서비스 이용 기록, 쿠키

제3조 (개인정보의 수집 및 이용 목적)
회사는 수집한 개인정보를 다음의 목적으로 이용합니다.
1. 회원 가입 및 관리: 회원제 서비스 이용에 따른 본인 확인, 회원자격 유지·관리
2. 서비스 제공: 투표, 랭킹 참여, 포인트 적립 등 서비스 기능 제공
3. 통계 분석: 서비스 이용 통계 및 분석을 통한 서비스 개선

제4조 (개인정보의 보유 및 이용 기간)
회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관련 법령에 의해 보존할 필요가 있는 경우 해당 법령에서 정한 기간 동안 보관합니다.
- 계약 또는 청약 철회 등에 관한 기록: 5년
- 소비자의 불만 또는 분쟁 처리에 관한 기록: 3년
- 웹사이트 방문 기록: 3개월

제5조 (개인정보의 제3자 제공)
회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 이용자의 동의가 있거나 법령의 규정에 의한 경우는 예외로 합니다.

제6조 (개인정보의 파기)
회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.

제7조 (이용자의 권리)
이용자는 언제든지 자신의 개인정보에 대해 열람, 수정, 삭제, 처리 정지를 요구할 수 있으며, 회사는 이에 대해 지체 없이 필요한 조치를 취합니다.

제8조 (개인정보 보호 책임자)
회사의 개인정보 보호 책임자는 다음과 같습니다.
- 이메일: steelmind7777@naver.com

본 방침은 2026년 2월 24일부터 시행됩니다.
`;

const TERMS_OF_SERVICE = `
제1조 (목적)
본 이용약관은 Rankit(이하 "회사")이 제공하는 크리에이터 영향력 랭킹 플랫폼 서비스(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자 간의 권리·의무 및 책임 사항 등을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 회사가 제공하는 크리에이터 투표, 랭킹, 포인트 적립, 예측 게임 등 일체의 서비스를 말합니다.
2. "이용자"란 본 약관에 동의하고 서비스를 이용하는 자를 말합니다.
3. "회원"이란 서비스에 가입하여 아이디를 부여받은 이용자를 말합니다.

제3조 (약관의 효력 및 변경)
1. 본 약관은 서비스를 이용하고자 하는 모든 이용자에게 적용됩니다.
2. 회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항에 게시합니다.

제4조 (서비스의 제공)
1. 회사는 다음의 서비스를 제공합니다.
   - 크리에이터 영향력 랭킹 서비스
   - 팬 투표 및 응원 서비스
   - 포인트 적립 및 사용 서비스
   - 예측 게임 서비스
   - 기타 회사가 정하는 서비스
2. 서비스는 연중무휴 24시간 제공을 원칙으로 합니다.

제5조 (이용자의 의무)
이용자는 다음 행위를 하여서는 안 됩니다.
1. 타인의 정보 도용
2. 서비스 운영을 방해하는 행위
3. 부정한 방법으로 투표하거나 포인트를 획득하는 행위
4. 다른 이용자에 대한 비방, 명예훼손 행위
5. 기타 관련 법령에 위배되는 행위

제6조 (서비스 이용의 제한)
회사는 이용자가 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우 서비스 이용을 제한할 수 있습니다.

제7조 (면책 조항)
1. 회사는 천재지변, 전쟁 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 책임이 면제됩니다.
2. 회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.

제8조 (분쟁 해결)
서비스 이용과 관련한 분쟁은 대한민국 법률에 따라 해결합니다.

본 약관은 2026년 2월 24일부터 시행됩니다.
`;

export const PrivacyPolicyModal = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[90vw] sm:max-w-lg max-h-[80vh] rounded-2xl">
      <DialogHeader>
        <DialogTitle className="text-base font-bold">개인정보 처리방침</DialogTitle>
      </DialogHeader>
      <ScrollArea className="h-[60vh] pr-4">
        <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-sans leading-relaxed">{PRIVACY_POLICY.trim()}</pre>
      </ScrollArea>
    </DialogContent>
  </Dialog>
);

export const TermsOfServiceModal = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[90vw] sm:max-w-lg max-h-[80vh] rounded-2xl">
      <DialogHeader>
        <DialogTitle className="text-base font-bold">이용약관</DialogTitle>
      </DialogHeader>
      <ScrollArea className="h-[60vh] pr-4">
        <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-sans leading-relaxed">{TERMS_OF_SERVICE.trim()}</pre>
      </ScrollArea>
    </DialogContent>
  </Dialog>
);
