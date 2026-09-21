-- ============================================================================
-- 21차(2026-09-21): "원터치 반응 숫자가 올라갔다가 새로고침하면 사라짐 /
-- 헤더에 '리뷰 0건'이 계속 뜸" 문제 재점검용 스크립트.
--
-- 배경: 17차(2026-09-16) 마이그레이션에 이미 이 문제의 원인과 해결책이
-- 정확히 기록돼 있었음 — reviews.content 컬럼이 CHECK 제약과 별개로
-- 컬럼 레벨 NOT NULL이 걸려 있어서, 원터치 반응(content=null로 insert)을
-- 시도할 때마다 조용히 실패함(서버 액션이 에러를 삼켜서 화면은 멀쩡해
-- 보이지만 DB에는 실제로 아무것도 안 쌓임). build-progress.md 맨 위에
-- "🔴 다음 세션 최우선 할 일"로 이 내용이 있었고 이시랑 님이 그 스크립트를
-- 실행했다고 확인해주셨는데도 증상이 남아있어서, 혹시 그때 일부만
-- 실행됐거나 순서가 꼬였을 가능성에 대비해 이 스크립트를 안전하게(여러 번
-- 실행해도 문제없이) 다시 제공함. 전체를 한 번에 그대로 실행하면 됨.
--
-- 사용법: Neon 콘솔 → SQL Editor에서 이 파일 전체를 붙여넣고 실행 →
-- 맨 아래 확인 쿼리 3개의 결과를 스크린샷으로 보내주시면 실제 원인을
-- 100% 확정할 수 있음.
-- ============================================================================

-- 1) 핵심 수정 — content 컬럼 레벨 NOT NULL 해제 + CHECK 제약 완화.
--    (이미 적용돼 있어도 안전하게 재실행 가능한 구문들)
alter table public.reviews drop constraint if exists reviews_content_check;
alter table public.reviews add constraint reviews_content_check
  check (content is null or char_length(content) <= 500);
alter table public.reviews alter column content drop not null;

-- 2) place_stats 뷰가 no_count까지 포함한 최신 버전인지 재확인(17차 12-3).
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
  max(r.created_at)                                                      as latest_review_at,
  count(*) filter (where r.verdict = 'no')                               as no_count
from public.places p
left join public.reviews r
  on r.place_id = p.id and r.status = 'published'
group by p.id;

-- ============================================================================
-- 3) 확인 쿼리 — 아래 3개를 실행한 결과를 그대로 보내주시면 진단이 끝남.
-- ============================================================================

-- 3-1) content 컬럼이 이제 진짜로 NULL 허용인지 (반드시 'YES'가 나와야 함)
select column_name, is_nullable
from information_schema.columns
where table_name = 'reviews' and column_name = 'content';

-- 3-2) 지금 이 순간 reviews 테이블에 실제로 몇 건이 쌓여있는지
select count(*) as total_reviews,
       count(*) filter (where content is null) as one_touch_votes,
       count(*) filter (where content is not null) as tips_with_text
from public.reviews;

-- 3-3) 가장 최근에 실제로 쌓인 반응 5건(있다면) — 언제 마지막으로
--      성공적으로 저장됐는지 확인용
select place_id, verdict, purpose, content, created_at
from public.reviews
order by created_at desc
limit 5;
