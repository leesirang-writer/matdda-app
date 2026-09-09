-- ============================================================================
-- 맛따라 멋따라 — Neon(PostgreSQL) 버전 스키마
--
-- Supabase 버전(schema/init_schema.sql)에서 아래 세 가지를 제거/조정했습니다.
--   1) profiles.id가 auth.users를 참조하던 것 -> Neon엔 auth 스키마가 없으므로 제거
--   2) 회원가입 자동 트리거(handle_new_user) -> 로그인 서버 액션이 직접 upsert
--   3) storage.buckets/objects, RLS 정책(auth.uid() 사용) -> 전부 제거.
--      권한 체크는 DB가 아니라 Next.js 서버 액션 코드에서 합니다.
--
-- 안전하게 재실행 가능합니다(IF NOT EXISTS / IF EXISTS 사용).
-- 이미 Neon에 places(90곳 적재됨)/reviews/courses/recommendation_logs 등이
-- 있어도 데이터를 지우지 않습니다.
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================================
-- 1. profiles — Neon 자체 회원 테이블 (auth.users 없음)
-- ============================================================================
create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  email         text,
  name          text,
  nickname      text,
  department    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 이미 다른 형태로 만들어져 있었을 경우를 대비한 방어적 보정.
-- (컬럼이 이미 있으면 아무 일도 일어나지 않습니다)
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists nickname text;
alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_email_key') then
    alter table public.profiles add constraint profiles_email_key unique (email);
  end if;
end $$;

comment on table public.profiles is 'Neon 자체 회원 테이블. 로그인은 사내 이메일(@kpr.co.kr) 게이트 + 이름/별명/부서 자율 입력 방식';

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 2. places — (이미 90곳 적재되어 있다면 이 블록은 사실상 아무 일도 안 함)
-- ============================================================================
create table if not exists public.places (
  id                    uuid primary key default gen_random_uuid(),
  kakao_place_id        text unique not null,
  name                  text not null,
  category              text,
  road_address          text,
  lot_address           text,
  latitude              double precision,
  longitude             double precision,
  phone                 text,
  kakao_url             text,
  walk_minutes          smallint,
  place_type            text not null default 'meal' check (place_type in ('meal', 'cafe', 'both')),
  price_range           smallint check (price_range between 1 and 4),
  has_room              boolean,
  max_party_size        smallint,
  reservation_required  boolean,
  has_parking           boolean,
  has_outlet            boolean,
  is_quiet              boolean,
  long_stay_ok          boolean,
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- places 테이블도 예전 버전(시설 컬럼들이 없는 형태)으로 이미 존재할 수 있으므로
-- reviews와 같은 방식으로 방어적 패치.
alter table public.places add column if not exists place_type text not null default 'meal';
alter table public.places add column if not exists price_range smallint;
alter table public.places add column if not exists has_room boolean;
alter table public.places add column if not exists max_party_size smallint;
alter table public.places add column if not exists reservation_required boolean;
alter table public.places add column if not exists has_parking boolean;
alter table public.places add column if not exists has_outlet boolean;
alter table public.places add column if not exists is_quiet boolean;
alter table public.places add column if not exists long_stay_ok boolean;
-- 관리자 페이지(/admin)에서 채워 넣는 큐레이션 정보: 대표 메뉴, 직접 지정한
-- 대표 사진 URL. image_url이 있으면 피드 카드는 리뷰 사진/카테고리 자동
-- 이미지보다 이걸 최우선으로 쓴다.
alter table public.places add column if not exists signature_menu text;
alter table public.places add column if not exists image_url text;
-- 20대 트렌드 핫플(을지로3가 힙지로 확장) 여부 — /admin에서 토글, 피드에서
-- "힙지로·트렌드"/"힙플레이스·디저트" 필터와 보라색 배지에 쓰인다.
alter table public.places add column if not exists is_trendy boolean not null default false;
alter table public.places add column if not exists created_by uuid;
alter table public.places add column if not exists created_at timestamptz not null default now();
alter table public.places add column if not exists updated_at timestamptz not null default now();

-- /admin에서 관리자가 좌표 없이(카카오 로컬 API를 다시 돌리지 않고) 수동으로
-- 새 핫플을 등록할 수 있도록, 원래 not null이던 위경도를 선택 입력으로 완화한다.
-- 기존 90곳 데이터(정확한 좌표 있음)에는 영향 없음 — 새로 추가되는 행만 null 허용.
alter table public.places alter column latitude drop not null;
alter table public.places alter column longitude drop not null;

create index if not exists idx_places_lat_lng on public.places (latitude, longitude);
create index if not exists idx_places_type on public.places (place_type);
create index if not exists idx_places_walk_minutes on public.places (walk_minutes);

drop trigger if exists trg_places_updated_at on public.places;
create trigger trg_places_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 3. tags
-- ============================================================================
create table if not exists public.tags (
  id          serial primary key,
  name        text unique not null,
  source      text not null default 'curated' check (source in ('curated', 'ai_generated')),
  created_at  timestamptz not null default now()
);

insert into public.tags (name, source) values
  ('#조용한', 'curated'), ('#든든한', 'curated'), ('#인테리어맛집', 'curated'),
  ('#가성비', 'curated'), ('#고급스러운', 'curated'), ('#빠른식사', 'curated'),
  ('#단체모임', 'curated'), ('#뷰맛집', 'curated')
on conflict (name) do nothing;


-- ============================================================================
-- 4. reviews
-- ============================================================================
create table if not exists public.reviews (
  id               uuid primary key default gen_random_uuid(),
  place_id         uuid not null references public.places(id) on delete cascade,
  author_id        uuid references public.profiles(id) on delete cascade,
  purpose          text not null check (purpose in ('client', 'remote_work', 'lunch', 'dinner', 'cafe')),
  verdict          text not null check (verdict in ('again', 'ok', 'no')),
  content          text check (char_length(content) between 1 and 500),
  ai_summary       text,
  price_per_person integer check (price_per_person >= 0),
  wait_minutes     smallint check (wait_minutes >= 0),
  party_size       smallint check (party_size >= 1),
  visit_date       date,
  display_mode     text not null default 'name' check (display_mode in ('name', 'nickname')),
  status           text not null default 'published' check (status in ('published', 'hidden', 'reported')),
  -- 2026-09-09(8차, 완전 익명 리뷰 전환): 사내 이메일 인증을 아예 없애면서
  -- author_id(profiles 참조)가 더 이상 채워지지 않는다. 대신 제출 시점에
  -- 입력한 소속 본부/팀과 닉네임(비웠으면 "익명의 동료")을 리뷰 행에 직접
  -- 저장한다 — 그 결과 author_id는 옛 이메일 로그인 시절 리뷰에만 남아있는
  -- "레거시" 컬럼이 된다.
  author_dept      text,
  author_name      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- reviews 테이블이 예전 버전(purpose/verdict/status 등이 없는 형태)으로 이미 존재하는
-- 경우를 대비한 방어적 패치. NOT NULL/CHECK는 기존 행을 깨뜨릴 수 있어 일부러 걸지
-- 않았고, 실제 값 검증은 애플리케이션(서버 액션) 쪽에서 이미 하고 있다.
alter table public.reviews add column if not exists purpose text;
alter table public.reviews add column if not exists verdict text;
alter table public.reviews add column if not exists content text;
alter table public.reviews add column if not exists ai_summary text;
alter table public.reviews add column if not exists price_per_person integer;
alter table public.reviews add column if not exists wait_minutes smallint;
alter table public.reviews add column if not exists party_size smallint;
alter table public.reviews add column if not exists visit_date date;
alter table public.reviews add column if not exists display_mode text not null default 'name';
alter table public.reviews add column if not exists status text not null default 'published';
alter table public.reviews add column if not exists created_at timestamptz not null default now();
alter table public.reviews add column if not exists updated_at timestamptz not null default now();
-- 익명 리뷰 전환(8차): 이메일 로그인이 없어졌으니 author_id를 더 이상 강제하지
-- 않는다(레거시 행은 계속 이 컬럼으로 profiles와 연결됨). content도 "한 줄
-- 꿀팁"이 선택 입력으로 바뀌어서 비어있을 수 있다.
alter table public.reviews alter column author_id drop not null;
alter table public.reviews alter column content drop not null;
alter table public.reviews add column if not exists author_dept text;
alter table public.reviews add column if not exists author_name text;

create index if not exists idx_reviews_place on public.reviews (place_id);
create index if not exists idx_reviews_author on public.reviews (author_id);
create index if not exists idx_reviews_feed on public.reviews (status, created_at desc);
create index if not exists idx_reviews_purpose on public.reviews (purpose, verdict);

drop trigger if exists trg_reviews_updated_at on public.reviews;
create trigger trg_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 5. review_photos — storage_path에는 이제 Vercel Blob의 공개 URL을 그대로 저장
-- ============================================================================
create table if not exists public.review_photos (
  id            uuid primary key default gen_random_uuid(),
  review_id     uuid not null references public.reviews(id) on delete cascade,
  storage_path  text not null,   -- Vercel Blob public URL
  width         integer,
  height        integer,
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_review_photos_review on public.review_photos (review_id, sort_order);


-- ============================================================================
-- 6. review_tags
-- ============================================================================
create table if not exists public.review_tags (
  review_id       uuid not null references public.reviews(id) on delete cascade,
  tag_id          integer not null references public.tags(id) on delete cascade,
  is_ai_suggested boolean not null default false,
  created_at      timestamptz not null default now(),
  primary key (review_id, tag_id)
);

create index if not exists idx_review_tags_tag on public.review_tags (tag_id);


-- ============================================================================
-- 7. review_helpful_votes
-- ============================================================================
create table if not exists public.review_helpful_votes (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  review_id   uuid not null references public.reviews(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, review_id)
);

-- review_helpful_votes도 예전 버전으로 이미 존재할 수 있으므로 방어적 패치.
alter table public.review_helpful_votes add column if not exists user_id uuid;
alter table public.review_helpful_votes add column if not exists review_id uuid;
alter table public.review_helpful_votes add column if not exists created_at timestamptz not null default now();

create index if not exists idx_helpful_votes_review on public.review_helpful_votes (review_id);


-- ============================================================================
-- 8. recommendation_logs
-- ============================================================================
create table if not exists public.recommendation_logs (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references public.profiles(id) on delete set null,
  purpose               text check (purpose in ('client', 'remote_work', 'lunch', 'dinner', 'cafe')),
  conditions            jsonb not null default '{}'::jsonb,
  recommended_place_ids uuid[] not null default '{}',
  selected_place_id     uuid references public.places(id) on delete set null,
  created_at            timestamptz not null default now()
);

-- recommendation_logs도 예전 버전으로 이미 존재할 수 있으므로 방어적 패치.
alter table public.recommendation_logs add column if not exists user_id uuid;
alter table public.recommendation_logs add column if not exists purpose text;
alter table public.recommendation_logs add column if not exists conditions jsonb not null default '{}'::jsonb;
alter table public.recommendation_logs add column if not exists recommended_place_ids uuid[] not null default '{}';
alter table public.recommendation_logs add column if not exists selected_place_id uuid;
alter table public.recommendation_logs add column if not exists created_at timestamptz not null default now();

create index if not exists idx_recommendation_logs_user on public.recommendation_logs (user_id, created_at desc);


-- ============================================================================
-- 9. courses
-- ============================================================================
create table if not exists public.courses (
  id            uuid primary key default gen_random_uuid(),
  meal_place_id uuid not null references public.places(id) on delete cascade,
  cafe_place_id uuid not null references public.places(id) on delete cascade,
  note          text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (meal_place_id, cafe_place_id)
);

-- courses도 예전 버전으로 이미 존재할 수 있으므로 방어적 패치.
alter table public.courses add column if not exists note text;
alter table public.courses add column if not exists created_by uuid;
alter table public.courses add column if not exists created_at timestamptz not null default now();


-- ============================================================================
-- 10. 집계 뷰
-- ============================================================================
-- 예전 버전의 뷰가 다른 컬럼 구성으로 이미 있으면 create or replace가
-- "cannot drop columns from view" 에러로 막히므로, 먼저 완전히 지우고 새로 만든다.
drop view if exists public.place_stats cascade;
drop view if exists public.place_purpose_stats cascade;

create or replace view public.place_stats as
select
  p.id as place_id,
  count(r.id)                                                            as review_count,
  count(*) filter (where r.verdict = 'again')                            as again_count,
  round(
    count(*) filter (where r.verdict = 'again')::numeric
    / nullif(count(r.id), 0) * 100, 1
  )                                                                       as again_rate,
  round(avg(r.price_per_person)::numeric, 0)                             as avg_price_per_person,
  max(r.created_at)                                                      as latest_review_at
from public.places p
left join public.reviews r
  on r.place_id = p.id and r.status = 'published'
group by p.id;

create or replace view public.place_purpose_stats as
select
  p.id as place_id,
  r.purpose,
  count(r.id)                                                 as review_count,
  round(
    count(*) filter (where r.verdict = 'again')::numeric
    / nullif(count(r.id), 0) * 100, 1
  )                                                            as again_rate
from public.places p
join public.reviews r
  on r.place_id = p.id and r.status = 'published'
group by p.id, r.purpose;


-- ============================================================================
-- 11. RLS 정리 — Neon엔 auth.uid()가 없으므로 DB 레벨 정책을 쓰지 않습니다.
--     (Supabase 버전을 그대로 실행했다가 ENABLE만 되고 정책 생성은 실패해
--      남아있을 수 있는 상태를 대비해 명시적으로 비활성화)
-- ============================================================================
alter table if exists public.profiles disable row level security;
alter table if exists public.places disable row level security;
alter table if exists public.reviews disable row level security;
alter table if exists public.review_photos disable row level security;
alter table if exists public.tags disable row level security;
alter table if exists public.review_tags disable row level security;
alter table if exists public.review_helpful_votes disable row level security;
alter table if exists public.recommendation_logs disable row level security;
alter table if exists public.courses disable row level security;

-- ============================================================================
-- 끝. 이 아래 확인 쿼리로 실제 컬럼 구조를 한 번 더 점검하세요.
-- (db/verify_schema.sql 참고)
-- ============================================================================
