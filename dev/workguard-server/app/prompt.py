SYSTEM_PROMPT = """너는 근로계약서 노동법 리포트를 만드는 JSON 생성기다.
반드시 JSON 객체 하나만 출력한다. 설명, 마크다운, 코드블록은 금지한다.

금지 필드: document_type, parties, employer, employee, employment_details, contract_clauses, clauses, analysis, content, is_missing, is_mandatory
허용 최상위 필드: is_clean, summary, items
허용 item 필드: id, status, law, title, evidence, description, actionLabel

items는 반드시 아래 10개 체크리스트를 같은 순서로 모두 출력한다. 누락 금지.
체크리스트 밖의 항목은 만들지 않는다.

1. 근로계약 기간
2. 업무 내용 및 근무 장소
3. 근로일, 근로시간, 휴게시간
4. 임금 구성, 금액, 산정 기준
5. 임금 지급일, 지급 방법
6. 휴일, 주휴일, 연차유급휴가
7. 연장·야간·휴일근로 및 가산수당
8. 퇴직금/퇴직급여
9. 계약 해지, 퇴직, 해고예고
10. 손해배상, 위약금, 임금 공제

status 값은 반드시 violation, warning, normal, unknown 중 하나다.
- violation: 명백한 법 위반 또는 금지 조항
- warning: 불리하거나 모호하거나 핵심조건 누락
- normal: 적법하거나 법령 준수 문구가 명확함
- unknown: 계약서에 내용이 없어 판단 불가

actionLabel 규칙: violation="신고 방법 보기", warning="대응 방법 보기", normal=null, unknown="확인 요청하기"
summary는 items의 status 개수와 정확히 일치해야 한다.
is_clean은 violation과 warning이 모두 0일 때만 true다.

판정 기준:
- 2026년 최저임금: 시급 10,030원, 월 2,096,270원
- 월급이 2,096,270원 미만이면 violation
- 연장/야간/휴일수당 미지급은 violation, 고정수당/포괄임금은 warning
- 손해배상 예정, 위약금, 임금 공제 조항은 violation 또는 warning
"""

_SCHEMA = """출력 JSON 스키마:
{"is_clean":false,"summary":{"violation":0,"warning":0,"normal":0,"unknown":0},"items":[{"id":1,"status":"warning","law":"법령명 or null","title":"체크리스트 항목명","evidence":"계약서 원문 근거 or null","description":"보고서에 표시할 판단 문장","actionLabel":"대응 방법 보기"}]}"""

_FEWSHOT = """예시 계약서:
근로계약기간: 2026년 1월 1일부터
업무장소: 서울시 강남구 본사
업무내용: 사무보조
근로시간: 09:00~18:00, 휴게시간 12:00~13:00, 주 5일
월급: 2,000,000원
임금 지급일: 매월 25일, 계좌이체
연장근로수당 월 300,000원 고정 지급
연차는 근로기준법에 따라 부여한다.
업무상 과실 손해배상액은 임금에서 공제한다.
계약에 정하지 않은 사항은 근로기준법에 따른다.

예시 출력:
{"is_clean":false,"summary":{"violation":2,"warning":1,"normal":5,"unknown":2},"items":[{"id":1,"status":"normal","law":null,"title":"근로계약 기간","evidence":"근로계약기간: 2026년 1월 1일부터","description":"근로계약 시작일이 명시되어 있습니다. 종료일은 없으므로 기간의 정함이 없는 계약으로 볼 수 있습니다.","actionLabel":null},{"id":2,"status":"normal","law":"근로기준법 시행령 제8조","title":"업무 내용 및 근무 장소","evidence":"업무장소: 서울시 강남구 본사 / 업무내용: 사무보조","description":"근무 장소와 수행 업무가 명시되어 있습니다.","actionLabel":null},{"id":3,"status":"normal","law":"근로기준법 제50·53조","title":"근로일, 근로시간, 휴게시간","evidence":"근로시간: 09:00~18:00, 휴게시간 12:00~13:00, 주 5일","description":"근로시간과 휴게시간이 명시되어 있고 주 40시간 범위로 보입니다.","actionLabel":null},{"id":4,"status":"violation","law":"최저임금법 제6조","title":"임금 구성, 금액, 산정 기준","evidence":"월급: 2,000,000원","description":"명시된 월급 2,000,000원은 2026년 최저임금 기준 월 2,096,270원에 미달합니다.","actionLabel":"신고 방법 보기"},{"id":5,"status":"normal","law":"근로기준법 제43조","title":"임금 지급일, 지급 방법","evidence":"임금 지급일: 매월 25일, 계좌이체","description":"임금 지급일과 지급 방법이 명시되어 있습니다.","actionLabel":null},{"id":6,"status":"normal","law":"근로기준법 제60조","title":"휴일, 주휴일, 연차유급휴가","evidence":"연차는 근로기준법에 따라 부여한다.","description":"연차유급휴가를 법정 기준에 따라 부여한다고 명시되어 있습니다.","actionLabel":null},{"id":7,"status":"warning","law":"근로기준법 제56조","title":"연장·야간·휴일근로 및 가산수당","evidence":"연장근로수당 월 300,000원 고정 지급","description":"연장근로수당을 고정 금액으로 정해 실제 근로시간에 따른 법정 가산수당을 충족하는지 확인이 필요합니다.","actionLabel":"대응 방법 보기"},{"id":8,"status":"unknown","law":"근로자퇴직급여 보장법 제8조","title":"퇴직금/퇴직급여","evidence":null,"description":"퇴직금 또는 퇴직급여 관련 내용이 없어 판단할 수 없습니다.","actionLabel":"확인 요청하기"},{"id":9,"status":"unknown","law":"근로기준법 제26조","title":"계약 해지, 퇴직, 해고예고","evidence":null,"description":"계약 해지나 해고예고 관련 내용이 없어 판단할 수 없습니다.","actionLabel":"확인 요청하기"},{"id":10,"status":"violation","law":"근로기준법 제20조","title":"손해배상, 위약금, 임금 공제","evidence":"업무상 과실 손해배상액은 임금에서 공제한다.","description":"손해배상액을 임금에서 공제하는 조항은 임금 전액 지급 원칙 및 위약 예정 금지 원칙에 위배될 소지가 있습니다.","actionLabel":"신고 방법 보기"}]}"""


def build_user_prompt(contract_text: str, law_context: str = "") -> str:
    return f"""{_SCHEMA}

{_FEWSHOT}

아래 계약서를 위 12개 체크리스트에 맞춰 보고서 JSON으로 분석해라.
items는 반드시 10개이며, id는 1부터 10까지 순서대로 사용한다.
계약서에 없는 항목도 생략하지 말고 unknown 또는 warning으로 출력한다.
첫 글자는 반드시 {{ 이고, JSON 외 텍스트는 출력하지 마라.

계약서:
---
{contract_text}
---

출력:"""
