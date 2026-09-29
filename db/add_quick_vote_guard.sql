-- ============================================================================
-- 21차-3(2026-09-23): "한자리에서 버튼 100번 누르면 숫자 조작 가능함" 문제 수정.
--
-- 원인: 원터치 반응([🔥 또 갈래요]/[🤔 굳이])은 로그인이 없어서, 지금까지는
-- 버튼을 누른 뒤 "새로고침 → 다시 누르기"를 반복하면 같은 사람이 같은
-- 장소에 리뷰 행(row)을 무한히 쌓을 수 있었다(클라이언트의 voted 상태는
-- 새로고침하면 그냥 초기화되는 화면용 값일 뿐, 서버는 중복 여부를 전혀
-- 확인하지 않았음).
--
-- 해결 방향: 로그인 없이도 "같은 브라우저"를 구분할 수 있는 익명 쿠키
-- (mm_device_id, 앱이 자동 발급)를 기준으로, "이 브라우저는 이 장소에
-- 이미 반응을 남겼는지"만 이 테이블에 기록해서 막는다 — 누가 눌렀는지는
-- 여전히 전혀 알 수 없고(정직한 데이터 원칙 유지), 같은 브라우저의 중복
-- 클릭만 막는다. 같은 사무실 IP를 막는 방식은(사내 앱 특성상 다들 같은
-- 공유기를 쓰므로) 동료 전체를 한 명처럼 취급해버려서 쓰지 않았다.
--
-- 사용법: Neon SQL Editor에서 전체 실행. 여러 번 실행해도 안전함.
-- ============================================================================

create table if not exists public.quick_vote_guard (
  place_id    uuid not null references public.places(id) on delete cascade,
  device_id   text not null,
  verdict     text not null check (verdict in ('again', 'no')),
  created_at  timestamptz not null default now(),
  primary key (place_id, device_id)
);

-- 확인) 테이블이 잘 만들어졌는지
select count(*) as guard_rows from public.quick_vote_guard;
