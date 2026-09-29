-- ============================================================================
-- 21차-2(2026-09-23): 원터치 반응이 "숫자는 올라가는데 새로고침하면 사라짐"
-- 문제의 진짜 최종 원인 수정.
--
-- Vercel Runtime Logs에서 실제로 확인된 에러:
--   원터치 반응 저장 실패: Error [NeonDbError]: null value in column
--   "department" of relation "profiles" violates not-null constraint
--
-- 배경: 원터치 반응([🔥 또 갈래요]/[🤔 굳이])은 소속조차 묻지 않는 완전
-- 무기명 참여 방식이라, lib/anon-profile.ts의 getOrCreateAnonVoterId()가
-- department를 일부러 null로 넣어서 "익명 동료" 공용 프로필 하나를
-- 만든다. 그런데 실제 Neon의 profiles.department 컬럼에는 예전 버전
-- (로그인 필수 + 소속 입력 필수였던 초기 설계)부터 내려온 NOT NULL
-- 제약이 아직 남아있었음 — db/init_schema_neon.sql의 `create table if
-- not exists`/`add column if not exists` 패턴은 "이미 있는 컬럼의 기존
-- 제약"까지는 건드리지 않기 때문에, 이 오래된 NOT NULL이 지금까지 한
-- 번도 안 풀리고 남아있었던 것. 그 결과 원터치 반응을 누를 때마다 이
-- 프로필 upsert 단계에서 매번 조용히 실패해서, 실제 리뷰 insert 자체가
-- 시도조차 안 되고 있었음(17차의 content NOT NULL 수정, 21차의 fetch
-- 캐싱 수정은 둘 다 정당한 개선이었지만 이번 버그의 원인은 아니었음).
--
-- 사용법: Neon SQL Editor에서 전체 실행. 여러 번 실행해도 안전함.
-- ============================================================================

alter table public.profiles alter column department drop not null;

-- 확인 1) 이제 department가 NULL을 허용하는지 (반드시 YES가 나와야 함)
select column_name, is_nullable
from information_schema.columns
where table_name = 'profiles' and column_name in ('email', 'name', 'nickname', 'department')
order by column_name;

-- 확인 2) 지금 이 스크립트만 실행해도 실제로 익명 프로필이 만들어지는지
-- 직접 테스트 — 앱 코드와 동일한 upsert를 그대로 재현해본다.
insert into profiles (email, name, nickname, department)
values ('anon-quickvote@internal.matdda.local', '익명 동료', '동료', null)
on conflict (email) do update set updated_at = now()
returning id, email, department;

-- 확인 3) 실제 reviews 건수 재확인
select count(*) as total_reviews from public.reviews;
