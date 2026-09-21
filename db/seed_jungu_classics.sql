-- ============================================================================
-- 중구 노포·맛집 확장 — 실속 있는 식당 23곳 일괄 등록 (2026-09-21, 수정)
--
-- 배경: 술집/이자카야/호프 등을 정리하고 나니 "든든한 점심"에 실제로 쓸 수
-- 있는 식당이 약 30곳으로 좁아짐. 처음엔 동대문(도보 26분)까지 포함해서
-- 15곳을 잡았는데, 사용자가 "26분은 에바"라며 실제 카카오맵 화면
-- 캡처(충무로역~을지로3가 사이, 충무로3가/저동2가 골목 일대)를 보내주고
-- "회사 사람들이 실제로 다니는 범위는 여기다 — 사랑방칼국수·진고개 둘 다
-- 실측 도보 5분"이라고 알려줌. 그래서 (1) 26분짜리 동대문 닭한마리집은
-- 빼고, (2) 사용자가 캡처에서 짚어준 골목 안의 실제 식당 9곳을 새로
-- 조사해서 추가함 — 이 9곳은 지도에 이름이 보였던 곳을 그대로 등록한 게
-- 아니라, 하나하나 다이닝코드/식신 등으로 실존·주소·전화번호를 재확인한
-- 것만 반영함(호프/술집류로 확인된 곳은 지도에 있어도 제외).
--
-- 나머지 회현동/명동/필동/충무로/초동/오장동/다동/을지로3가 권역(도보
-- 9~17분)은 그대로 유지 — 카카오 로컬 API로 수집한 게 아니라 다이닝코드/
-- 식신/미쉐린가이드/언론 기사 등 웹 검색으로 실존·영업 여부와 주소·
-- 전화번호를 하나씩 확인한 실제 장소들. 이 프로젝트의 "정직한 데이터"
-- 원칙에 따라, 전화번호를 못 찾은 3곳(대박물갈비/연길반점/윤영밥상)은
-- 지어내지 않고 비워둠(추후 확인되면 /admin에서 채우면 됨).
--
-- 도보 시간은 실측이 아니라 주소 기준 지리적 추정치(을지로 힙지로
-- 세트와 동일한 관례이며, 충무로3가/저동2가 골목 9곳은 사용자가 확인해준
-- "5분 실측"을 기준으로 같은 골목 안 위치 차이만큼만 가감함) — 정확한
-- 값을 알게 되면 /admin에서 언제든 수정 가능함. 이자카야/호프/술집
-- 계열은 이번에도 의도적으로 전부 배제함(사용자가 "쓸데없는 정보"라며
-- 정리를 요청한 것과 같은 기준).
--
-- kakao_place_id는 사람이 읽을 수 있는 고유 슬러그(manual-...)이고,
-- on conflict do nothing이 걸려 있어 재실행해도 중복 등록되지 않음.
-- 카카오맵 링크는 "이름으로 검색" 링크(정확한 개별 place_id 미확보).
--
-- 실행 방법: Neon 콘솔 → SQL Editor → 이 파일 전체를 붙여넣고 실행.
-- (주의: 17차 리뷰 시스템 마이그레이션이 아직 안 되어 있다면 그것부터
-- 먼저 실행할 것 — build-progress.md 맨 위 참고. 이 스크립트는 그것과
-- 무관하게 독립적으로 실행 가능함.)
-- ============================================================================

insert into public.places (
  kakao_place_id, name, category, road_address, phone,
  place_type, walk_minutes, signature_menu, kakao_url, is_trendy
) values

-- 회현동 (남산스퀘어와 가장 가까운 권역, 도보 8~9분)
(
  'manual-jungu-daebak-mulgalbi', '대박물갈비', '음식점 > 한식 > 물갈비',
  '서울 중구 퇴계로4길 7 1층', null,
  'meal', 9, '전주식 물갈비(돼지갈비살)', 'https://map.kakao.com/link/search/대박물갈비', false
),
(
  'manual-jungu-yeongil-banjeom', '연길반점', '음식점 > 중식 > 양꼬치',
  '서울 중구 퇴계로 42-2', null,
  'meal', 9, '어향가지 · 양꼬치', 'https://map.kakao.com/link/search/연길반점%20중구', false
),
(
  'manual-jungu-yunyeong-bapsang', '윤영밥상', '음식점 > 한식 > 갈치조림',
  '서울 중구 퇴계로 57-1', null,
  'meal', 9, '40년 전통 갈치조림', 'https://map.kakao.com/link/search/윤영밥상', false
),

-- 충무로3가·저동2가·필동1가 골목 (사용자가 지도 캡처로 짚어준 범위 —
-- 사랑방칼국수·진고개 실측 도보 5분 기준, 같은 골목 안이라 도보 5~6분)
(
  'manual-jungu-sarangbang-kalguksu', '사랑방칼국수', '음식점 > 한식 > 칼국수',
  '서울 중구 퇴계로27길 46', '0507-1427-2043',
  'meal', 5, '백숙백반 · 칼국수 (50년 전통 노포)', 'https://map.kakao.com/link/search/사랑방칼국수', false
),
(
  'manual-jungu-jingogae', '진고개', '음식점 > 한식 > 갈비찜',
  '서울 중구 충무로 19-1', '02-2267-0955',
  'meal', 5, '갈비찜정식 · 갈비탕 · 어복쟁반', 'https://map.kakao.com/link/search/진고개%20충무로', false
),
(
  'manual-jungu-seoul-ttukbaegi', '서울뚝배기', '음식점 > 한식 > 뚝배기',
  '서울 중구 수표로6길 1 금용빌딩', '02-2263-0596',
  'meal', 5, '해물된장뚝배기 · 순두부 · 북어국', 'https://map.kakao.com/link/search/서울뚝배기%20충무로', false
),
(
  'manual-jungu-chungmuro-jokbal', '충무로족발', '음식점 > 한식 > 족발',
  '서울 중구 퇴계로27길 41', '02-2263-0903',
  'meal', 5, '족발 · 쟁반막국수', 'https://map.kakao.com/link/search/충무로족발', false
),
(
  'manual-jungu-namhae-hoetjip', '남해횟집', '음식점 > 한식 > 생선회',
  '서울 중구 수표로 22-14 1층', '02-2269-7507',
  'meal', 5, '모듬생선회 · 회덮밥 · 매운탕', 'https://map.kakao.com/link/search/남해횟집%20을지로', false
),
(
  -- 저동2가 소재, 위 골목에서 한 블록 정도 더 들어감.
  'manual-jungu-gossine-gochujang', '고씨네 고추장찌개', '음식점 > 한식 > 찌개',
  '서울 중구 수표로 26 1층', '010-7111-4328',
  'meal', 6, '고추장찌개 · 가브리 수육', 'https://map.kakao.com/link/search/고씨네%20고추장찌개', false
),
(
  'manual-jungu-pjh-sushi', '박지후스시', '음식점 > 일식 > 스시',
  '서울 중구 수표로6길 33 1층', '010-8246-2191',
  'meal', 6, '초밥정식 · 사시미+스시 세트', 'https://map.kakao.com/link/search/박지후스시', false
),
(
  'manual-jungu-gangneung-jangkal', '강릉장칼국수&보쌈 충무로점', '음식점 > 한식 > 장칼국수',
  '서울 중구 수표로6길 39', '0507-1316-6428',
  'meal', 6, '원조 장칼국수 · 화산 불판 보쌈', 'https://map.kakao.com/link/search/강릉장칼국수%26보쌈%20충무로점', false
),
(
  -- 필동1가 소재, 위 골목보다 살짝 더 걸어야 함.
  'manual-jungu-chungmuro-jjukkumi', '충무로쭈꾸미불고기 충무로본점', '음식점 > 한식 > 쭈꾸미',
  '서울 중구 퇴계로31길 11', '02-2279-0803',
  'meal', 6, '쭈꾸미 · 가이바시(키조개)', 'https://map.kakao.com/link/search/충무로쭈꾸미불고기%20충무로본점', false
),

-- 명동 (도보 9~11분)
(
  'manual-jungu-myeongdong-gyoja', '명동교자 본점', '음식점 > 한식 > 칼국수',
  '서울 중구 명동10길 29', '0507-1366-5348',
  'meal', 11, '칼국수 · 만두 · 비빔국수', 'https://map.kakao.com/link/search/명동교자%20본점', false
),
(
  'manual-jungu-mikado-sushi', '미카도스시 명동점', '음식점 > 일식 > 회전초밥',
  '서울 중구 명동길 14 지하1층 (눈스퀘어)', '02-318-8259',
  'meal', 10, '회전초밥(전 접시 균일가)', 'https://map.kakao.com/link/search/미카도스시%20명동점', false
),

-- 필동·충무로·초동 (도보 9~13분)
(
  -- 미쉐린 가이드 등재. 브레이크타임 15:00~17:00, 일요일 정기휴무 — 방문 전 확인 필요.
  'manual-jungu-pildong-myeonok', '필동면옥', '음식점 > 한식 > 평양냉면',
  '서울 중구 서애로 26', '02-2266-2611',
  'meal', 9, '평양냉면 · 접시만두 · 수육', 'https://map.kakao.com/link/search/필동면옥', false
),
(
  'manual-jungu-namsan-kalguksu', '남산칼국수', '음식점 > 한식 > 칼국수',
  '서울 중구 퇴계로 235 B동 1층 125호', '02-2275-5285',
  'meal', 11, '손칼국수 · 우삼겹 비빔칼국수', 'https://map.kakao.com/link/search/남산칼국수', false
),
(
  'manual-jungu-nongga-sundaeguk', '농가순대국', '음식점 > 한식 > 순대국',
  '서울 중구 충무로4길 5', '02-2265-6459',
  'meal', 11, '순대국 · 머릿고기', 'https://map.kakao.com/link/search/농가순대국', false
),
(
  'manual-jungu-myeongpum-euljisundae', '명품을지순대국', '음식점 > 한식 > 순대국',
  '서울 중구 충무로5길 3', '02-2268-7772',
  'meal', 12, '순대국', 'https://map.kakao.com/link/search/명품을지순대국', false
),
(
  'manual-jungu-damso-sundae', '담소 소사골 순대 육개장 충무로점', '음식점 > 한식 > 순대국',
  '서울 중구 충무로 34', '02-2276-1821',
  'meal', 12, '일품순대국(소사골) · 담소육개장', 'https://map.kakao.com/link/search/담소%20소사골%20순대%20육개장%20충무로점', false
),

-- 오장동 (도보 15분)
(
  'manual-jungu-ojangdong-heungnamjip', '오장동흥남집 본점', '음식점 > 한식 > 함흥냉면',
  '서울 중구 마른내로 114', '02-2266-0735',
  'meal', 15, '회비빔냉면 · 물냉면 (4대째 함흥냉면 노포)', 'https://map.kakao.com/link/search/오장동흥남집%20본점', false
),

-- 다동·을지로3가 (도보 14~17분, 반경을 넓혀 포함한 권역)
(
  -- 1956년 개업, 무교동 노포.
  'manual-jungu-buminok', '부민옥', '음식점 > 한식 > 육개장',
  '서울 중구 다동길 24-12', '02-777-2345',
  'meal', 17, '양곰탕 · 육개장 · 양무침', 'https://map.kakao.com/link/search/부민옥%20다동', false
),
(
  -- 미쉐린 빕 구르망 8년 연속 선정, 1972년 개업 3대째 운영.
  'manual-jungu-nampo-myeonok', '남포면옥 시청점', '음식점 > 한식 > 평양냉면',
  '서울 중구 을지로3길 24', '02-777-2269',
  'meal', 17, '평양냉면 · 어복쟁반', 'https://map.kakao.com/link/search/남포면옥%20시청점', false
),
(
  -- 75년 전통 을지로 노포 중식당, 한국 최초 굴짬뽕으로 유명.
  'manual-jungu-andongjang', '안동장', '음식점 > 중식 > 짬뽕',
  '서울 중구 을지로3가 315-18', '02-2266-3814',
  'meal', 14, '굴짬뽕 · 삼선짬뽕밥', 'https://map.kakao.com/link/search/안동장%20을지로3가', false
)

on conflict (kakao_place_id) do nothing;
