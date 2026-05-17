Intermediate Project Proposal

Project Title & Info: Project name, your name, student ID. (If you are an approved 2-person team, list both members).
Target Domain & Problem: Briefly describe the service domain (e.g., Traffic, Health, Parking, Energy, Security, Disaster, Lighting, Environment……) and the problem your system will solve.
System Architecture Diagram: A high-level visual diagram or flowchart showing your 6-step pipeline: (Data Generation ➔ Transmission ➔ Collection ➔ AI/Recovery ➔ Decision ➔ Dashboard).
Intentional Constraints Design: Detail the network friction you will inject (e.g., “I will use a sleep() function to simulate 2-second delay,” or “I will randomly drop 10% of packets”).
Data & Decision Logic: What type of data will you use (sensor, image, text)? What simple AI/logic (thresholding, filtering) will you use to recover data and make a final decision?
Tech Stack: Languages and frameworks you plan to use (e.g., Python, Streamlit, Flask….).
Role Division (For 2-person Teams ONLY): Clearly specify the expected technical contribution of each member.

현재까지 구현한거 봐줘. 이정도로 발표하면 될까? 로그인 > 사용자가 홍보할 카페 입력, url > 공지 스크롤 후 ai 한테 입력(미리 만들어둔 샘플로 대신함) > ai 분석 > json으로 추출 > 규칙 로딩 > 퀘스트 생성 > 퀘스트 완료 클릭 > 다음 퀘스트 등장 및 알람( 알람은 사이트에서 토스트 알람 정도만 햇음)

이걸 토대로 발표자료를 만들어야 하는데 어떤식으로 슬라이드 구성하면 좋을지
어떤 점을 토대로 시연 발표 영상을 찍으면 좋을지, 어떤 대본으로 사용하면 좋을지를 ppt.md 파일 밑에 추가해줄래?
정리하면, 1. 발표 시연 영상 과정 2. 시연 영상에 따른 대본 3. 현장 발표를 위한 ppt 슬라이드 구성 추천 세가지를 해줘.

---

# 발표 준비 정리

## 1. 발표 시연 영상 과정

> 전체 시연 시간 목표: **3~4분**
> 6단계 파이프라인(Data Generation → Transmission → Collection → AI/Recovery → Decision → Dashboard)이 자연스럽게 드러나도록 구성

### Step 0 — 로그인 (15초)
- 이메일/비밀번호로 로그인
- 대시보드 메인 화면 진입

### Step 1 — Data Generation: 카페 등록 + 규칙 입력 (30초)
- 대시보드에서 "카페 추가하기" 클릭
- 카페 이름(예: "맘카페 서울") + 네이버 카페 URL 입력 → 등록
- 사이드바에 카페 즉시 등장 확인
- 해당 카페 클릭 → 카페 상세 페이지 진입
- AI 규칙 분석 섹션에 **미리 준비한 샘플 공지 텍스트** 붙여넣기

### Step 2 & 3 — Transmission & Collection: AI 분석 요청 → DB 저장 (30초)
- "AI로 규칙 분석하기" 버튼 클릭
- 분석 중 로딩 스피너 보여주기
- 분석 완료 토스트 등장
- 내 규칙 설정 섹션에 JSON 기반 값(금지어, 홍보 요일, 등업 조건 등)이 자동 채워진 것 확인
- "내 규칙으로 저장하기" 클릭 → Supabase에 저장

### Step 4 — AI/Recovery: JSON 추출 결과 확인 (20초)
- 내 규칙 설정 패널에서 추출된 구조화 데이터 보여주기
  - 금지어, 홍보 허용 요일, 등업 조건(게시글 수 / 댓글 수 / 활동일), 홍보 가능 등급

### Step 5 — Decision: 나의 현황 입력 → 미션 자동 생성 (40초)
- "나의 현황" 섹션에서 수정 버튼 클릭
- 현재 등급, 게시글 수, 댓글 수, 활동일 입력 → 저장
- "다음 홍보 가능일", "등업까지" 수치 변화 확인
- 오늘의 미션 페이지로 이동
- "스케줄 재생성" 버튼 클릭 → 카페별 미션 카드 자동 생성
- 미션 목록(게시글 작성 1/3, 댓글 달기 1/10 등) 화면 보여주기

### Step 6 — Dashboard: 미션 완료 + 통계 반영 (40초)
- 첫 번째 미션 "완료" 클릭
- 토스트 알림: "다음 미션: 댓글 달기 2/10" 등장
- 두 번째 미션도 완료 클릭
- 대시보드 메인으로 돌아가기
- 통계 카드(완료한 미션 숫자 증가) 확인
- 오늘의 미션 현황 카드에 카페별 다음 할 일 표시 확인

---

## 2. 시연 영상에 따른 대본

**[Step 0 — 로그인]**

> "안녕하세요. 카페가드 시연을 시작하겠습니다.
> 카페가드는 네이버 카페 홍보 활동을 도와주는 개인화 퀘스트 시스템입니다.
> 먼저 이메일로 로그인합니다."


**[Step 1 — 카페 등록 + 규칙 입력]**

> "대시보드에서 카페를 추가합니다. 카페 이름과 URL을 입력하면 사이드바에 즉시 등록됩니다.
> 이제 카페 상세 페이지로 들어가서, 네이버 카페 공지에서 복사해온 규칙 텍스트를 붙여넣겠습니다.
> 실제 서비스에서는 사용자가 직접 공지를 복사하지만, 오늘은 미리 준비한 샘플 텍스트를 사용합니다."


**[Step 2 & 3 — AI 분석 요청 → 저장]**

> "'AI로 규칙 분석하기' 버튼을 누르면, 텍스트가 서버를 통해 Groq AI에 전송됩니다.
> 이것이 Transmission 단계입니다.
> AI가 분석을 마치면 결과가 내 규칙 설정 칸에 자동으로 채워집니다.
> '내 규칙으로 저장하기'를 누르면 Supabase 데이터베이스에 저장됩니다. Collection 단계입니다."


**[Step 4 — JSON 추출 결과 확인]**

> "AI가 비정형 한국어 공지 텍스트에서 구조화된 데이터를 추출했습니다.
> 금지어, 홍보 가능 요일, 등업에 필요한 게시글 수와 댓글 수, 활동일 수, 최소 등급이 JSON 형태로 파싱되어 화면에 표시됩니다.
> 이 과정이 AI Recovery 단계에 해당합니다."


**[Step 5 — 나의 현황 입력 → 미션 생성]**

> "다음으로 Decision 단계입니다.
> 나의 현황에 현재 등급과 활동 지수를 입력하면, 시스템이 카페 규칙과 내 현황을 비교해 부족한 조건을 계산합니다.
> 오늘의 미션 페이지에서 스케줄 재생성을 누르면, 등업까지 필요한 게시글과 댓글 미션이 날짜별로 자동 생성됩니다.
> 게시글은 이틀에 하나, 댓글은 하루에 두 개씩 배분해 부담을 줄였습니다."


**[Step 6 — 미션 완료 + 대시보드 확인]**

> "마지막으로 Dashboard 단계입니다.
> 미션을 완료하면 토스트 알림으로 다음 미션이 안내됩니다.
> 완료할 때마다 게시글 수와 댓글 수가 나의 현황에 자동으로 반영됩니다.
> 대시보드로 돌아가면 완료한 미션 수가 실시간으로 갱신되고, 오늘의 미션 현황 카드에서 카페별 다음 할 일을 한눈에 볼 수 있습니다.
> 이상으로 카페가드 시연을 마치겠습니다. 감사합니다."

---

## 3. 현장 발표를 위한 PPT 슬라이드 구성 추천

> 총 슬라이드 수: **7~8장** / 발표 시간: 5~7분 기준

---

### Slide 1 — Title
```
Project Title: CafeGuard — Naver Cafe Promotion Quest System
이름 / 학번
```

---

### Slide 2 — Target Domain & Problem
```
Domain: Small Business / Social Media Marketing

Problem:
- 네이버 카페마다 홍보 규칙이 다름 (금지어, 요일, 등급 등)
- 사장님들이 규칙을 일일이 확인하다 실수 → 홍보 글 삭제, 강퇴
- 등업 조건도 카페마다 달라 체계적 관리가 어려움

Solution:
- 규칙 텍스트 → AI 분석 → 개인화 퀘스트 자동 생성
```

---

### Slide 3 — System Architecture (6-Step Pipeline)
```
[Data Generation]     사용자가 카페 공지 텍스트 입력
        ↓
[Transmission]        Next.js API → Groq AI (HTTP POST, 8000자 제한)
        ↓
[Collection]          Supabase PostgreSQL에 rules_override(JSONB) 저장
        ↓
[AI / Recovery]       llama-3.3-70b: 비정형 텍스트 → 구조화 JSON 추출
                      (금지어, 홍보 요일, 등업 조건, 등급)
        ↓
[Decision]            mission-scheduler: 현황 vs 규칙 비교 → 날짜별 미션 생성
                      (등업 조건 미달 → 등업 미션 / 달성 → 홍보 미션)
        ↓
[Dashboard]           대시보드 통계 / 카페별 현황 / 오늘의 미션 퀘스트
```
→ 다이어그램 형태로 시각화 권장

---

### Slide 4 — Intentional Constraints Design
```
Network Constraint: API Rate Limiting (RPD / RPM)
- Groq 무료 API: 하루 500회(RPD), 분당 30회(RPM) 요청 제한
- 제한 초과 시 429 에러 반환 → 사용자에게 안내 메시지 표시
- 실제 운영 시 유료 플랜 전환 또는 retry logic 적용 예정

Effect: 제약 조건 하에서도 핵심 기능(분석 → 저장)은 정상 동작
```

---

### Slide 5 — Data & Decision Logic
```
Data Type: Text (한국어 카페 공지 비정형 텍스트)

AI Logic (Groq llama-3.3-70b):
- JSON mode로 구조화 출력 강제
- 다단계 등업 조건 → 누적 합산값으로 계산
- 등급명(준회원/정회원 등) → 숫자로 변환

Decision Logic (mission-scheduler.ts):
- current_level vs level_required 비교
- posts_for_level_up - post_count = 남은 게시글 미션 수
- comments_for_level_up - comment_count = 남은 댓글 미션 수
- 게시글: 2일 간격 / 댓글: 하루 2개로 분산
- 등업 조건 전부 충족 후에만 홍보 미션 생성
```

---

### Slide 6 — Tech Stack
```
Frontend:  Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
Backend:   Next.js API Routes (Serverless)
Database:  Supabase (PostgreSQL + Row Level Security)
AI:        Groq API — llama-3.3-70b-versatile (JSON mode)
Notify:    Sonner (Toast) → 카카오/문자 확장 가능 구조
Deploy:    Vercel (예정)
```

---

### Slide 7 — Demo Preview (스크린샷 or 화면 캡처)
```
[화면 1] 대시보드 — 통계 카드 + 오늘의 미션 현황
[화면 2] 카페 상세 — 나의 현황 + AI 규칙 분석 + 내 규칙 설정
[화면 3] 오늘의 미션 — 카페별 그룹, 퀘스트 목록, 완료 버튼
```
→ 시연 영상으로 대체 가능

---

### Slide 8 — Summary & Next Steps
```
현재 구현:
✅ 로그인/회원가입 / 카페 등록 / AI 규칙 분석
✅ 개인화 규칙 저장 / 나의 현황 / 다음 홍보 가능일 계산
✅ 날짜별 미션 스케줄 자동 생성 / 순차 완료 알림
✅ 대시보드 실시간 통계

향후 계획:
- 홍보 전 컨펌 (홍보 글 규칙 위반 검사)
- 카카오톡 / 문자 알림 연동
- 플랜 제한 및 구독 시스템
```