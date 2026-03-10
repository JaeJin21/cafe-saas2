-- ================================================
-- 네이버 카페 홍보 스케줄링 SaaS - DB 스키마
-- Supabase SQL Editor에 전체 복사 후 실행
-- ================================================


-- ------------------------------------------------
-- 0. 확장 모듈
-- ------------------------------------------------



-- ------------------------------------------------
-- 1. users (사장님 프로필)
--    Supabase Auth의 auth.users와 1:1 연결
-- ------------------------------------------------
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  nickname      TEXT,
  business_name TEXT,                        -- 가게 이름
  phone         TEXT,
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS '사장님 프로필 (auth.users 확장)';


-- ------------------------------------------------
-- 2. cafe_master (전국 네이버 카페 정보)
--    관리자가 관리하는 공용 테이블
-- ------------------------------------------------
CREATE TABLE public.cafe_master (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  url                 TEXT NOT NULL UNIQUE,
  category            TEXT,                  -- 예: 맛집, 뷰티, 인테리어
  region              TEXT,                  -- 예: 서울, 경기, 전국
  member_count        INTEGER DEFAULT 0,

  -- 금지어
  banned_words        TEXT[] NOT NULL DEFAULT '{}',

  -- 홍보 허용 요일 (0=일 ~ 6=토)
  promo_days          INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',

  -- 홍보 허용 시간대
  promo_time_start    TIME,                  -- 예: '09:00'
  promo_time_end      TIME,                  -- 예: '21:00'

  -- 홍보 주기 제한
  promo_interval_days INTEGER NOT NULL DEFAULT 7,  -- 최소 N일 간격으로 홍보 가능

  -- 등업 조건
  level_required      INTEGER NOT NULL DEFAULT 1,  -- 홍보 가능 최소 등급
  posts_for_level_up  INTEGER DEFAULT NULL,         -- 등업에 필요한 게시글 수
  comments_for_level_up INTEGER DEFAULT NULL,       -- 등업에 필요한 댓글 수
  days_for_level_up   INTEGER DEFAULT NULL,         -- 등업에 필요한 활동 일수

  -- 기타
  notes               TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cafe_master IS '전국 네이버 카페 마스터 정보';
COMMENT ON COLUMN public.cafe_master.promo_days IS '0=일,1=월,2=화,3=수,4=목,5=금,6=토';
COMMENT ON COLUMN public.cafe_master.promo_interval_days IS '동일 카페에 재홍보 가능한 최소 간격(일)';


-- ------------------------------------------------
-- 3. user_cafe_map (유저가 가입한 카페 + 활동 지수)
-- ------------------------------------------------
CREATE TABLE public.user_cafe_map (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cafe_id           UUID NOT NULL REFERENCES public.cafe_master(id) ON DELETE CASCADE,

  -- 현재 활동 지수
  current_level     INTEGER NOT NULL DEFAULT 1,
  post_count        INTEGER NOT NULL DEFAULT 0,
  comment_count     INTEGER NOT NULL DEFAULT 0,
  active_days       INTEGER NOT NULL DEFAULT 0,

  -- 마지막 홍보 날짜 (재홍보 간격 체크용)
  last_promo_date   DATE,

  -- 이 카페에서 홍보 활성화 여부 (유저가 직접 ON/OFF)
  is_enabled        BOOLEAN NOT NULL DEFAULT TRUE,

  joined_at         DATE,                    -- 카페 가입일
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, cafe_id)
);

COMMENT ON TABLE public.user_cafe_map IS '유저별 가입 카페 및 활동 현황';


-- ------------------------------------------------
-- 4. mission_log (일일 미션 발송 및 수행 이력)
-- ------------------------------------------------
CREATE TABLE public.mission_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cafe_id         UUID NOT NULL REFERENCES public.cafe_master(id) ON DELETE CASCADE,

  mission_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  mission_type    TEXT NOT NULL CHECK (mission_type IN (
                    'promo_post',    -- 홍보 게시글 작성
                    'comment',       -- 댓글 달기
                    'level_up_post', -- 등업용 게시글
                    'check_rule'     -- 규칙 확인 미션
                  )),
  title           TEXT NOT NULL,
  content         TEXT,              -- 추천 게시글 내용 (템플릿)

  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'done', 'skipped')),
  done_at         TIMESTAMPTZ,       -- 완료 처리 시각

  -- 미션 수행 결과 메모 (유저 입력)
  result_note     TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.mission_log IS '유저에게 발송된 일일 미션 및 수행 이력';


-- ------------------------------------------------
-- 5. 인덱스
-- ------------------------------------------------
CREATE INDEX idx_user_cafe_map_user_id   ON public.user_cafe_map(user_id);
CREATE INDEX idx_user_cafe_map_cafe_id   ON public.user_cafe_map(cafe_id);
CREATE INDEX idx_mission_log_user_date   ON public.mission_log(user_id, mission_date);
CREATE INDEX idx_mission_log_status      ON public.mission_log(status);
CREATE INDEX idx_cafe_master_region      ON public.cafe_master(region);
CREATE INDEX idx_cafe_master_category    ON public.cafe_master(category);


-- ------------------------------------------------
-- 6. updated_at 자동 갱신 트리거
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_cafe_master_updated_at
  BEFORE UPDATE ON public.cafe_master
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_user_cafe_map_updated_at
  BEFORE UPDATE ON public.user_cafe_map
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ------------------------------------------------
-- 7. RLS (Row Level Security) 활성화
-- ------------------------------------------------
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_master    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cafe_map  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_log    ENABLE ROW LEVEL SECURITY;

-- users: 본인 데이터만 읽기/수정
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- cafe_master: 모든 로그인 유저가 읽기 가능 (수정은 관리자만)
CREATE POLICY "cafe_master_select_all" ON public.cafe_master
  FOR SELECT USING (auth.role() = 'authenticated');

-- user_cafe_map: 본인 데이터만
CREATE POLICY "user_cafe_map_select_own" ON public.user_cafe_map
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_cafe_map_insert_own" ON public.user_cafe_map
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_cafe_map_update_own" ON public.user_cafe_map
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_cafe_map_delete_own" ON public.user_cafe_map
  FOR DELETE USING (auth.uid() = user_id);

-- mission_log: 본인 데이터만
CREATE POLICY "mission_log_select_own" ON public.mission_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mission_log_insert_own" ON public.mission_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mission_log_update_own" ON public.mission_log
  FOR UPDATE USING (auth.uid() = user_id);


-- ------------------------------------------------
-- 8. 신규 유저 가입 시 users 테이블 자동 생성 트리거
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
