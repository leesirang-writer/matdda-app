-- ============================================================================
-- 을지로3가 힙지로 확장 — 20대 트렌드 핫플 19곳 일괄 등록
--
-- 카카오 로컬 API로 새로 수집한 게 아니라, 웹 검색(다이닝코드/식신/언론 기사)으로
-- 실존·영업 여부를 확인한 실제 장소들입니다. 정확한 위경도(latitude/longitude)는
-- 몰라서 비워두었고(스키마가 이미 nullable로 완화되어 있음), 도보 시간은 "을지로
-- 3가/4가 권역, 퇴계로 173에서 도보 10~15분"이라는 지리적 추정치입니다 — 실측이
-- 아니므로 정확한 시간을 알게 되면 /admin에서 얼마든지 고쳐도 됩니다.
--
-- kakao_place_id는 실제 카카오 place_id가 아니라 사람이 읽을 수 있는 고유
-- 슬러그(manual-...)를 직접 넣었습니다. ON CONFLICT DO NOTHING이 걸려 있어서
-- 이 스크립트를 실수로 두 번 실행해도 중복 등록되지 않습니다(안전하게 재실행
-- 가능한 프로젝트 관례를 따름).
--
-- 카카오맵 링크는 실제 place 페이지가 아니라 "이름으로 검색" 링크입니다
-- (정확한 카카오맵 place_id는 확보하지 못함) — 클릭하면 검색 결과가 뜨고,
-- 정확한 개별 링크를 알게 되면 /admin에서 대표 사진 URL과 함께 손보면 됩니다.
--
-- 실행 방법: Neon 콘솔 → SQL Editor → 이 파일 전체를 붙여넣고 실행.
-- ============================================================================

insert into public.places (
  kakao_place_id, name, category, road_address, phone,
  place_type, walk_minutes, signature_menu, kakao_url, is_trendy
) values

-- 사용자 지정 2곳 (필수 포함)
(
  'manual-euljiro-oldies-taco', '올디스타코', '음식점 > 멕시칸 > 타코',
  '서울특별시 중구 충무로4길 3 1층 (한신빌딩)', '02-6397-6969',
  'meal', 13, '올디스타코 · 비리아타코', 'https://map.kakao.com/link/search/올디스타코%20을지로', true
),
(
  'manual-euljiro-asoto-bakery', '아소토베이커리', '카페 > 베이커리',
  '서울특별시 중구 수표로10길 19, 1층', '0507-1331-5076',
  'cafe', 13, '메론빵', 'https://map.kakao.com/link/search/아소토베이커리', true
),

-- 추가 발굴 17곳
(
  'manual-euljiro-jangmanok', '을지 장만옥', '음식점 > 중식 > 홍콩가정식',
  '서울 중구 을지로12길 12 1층', '0507-1469-7575',
  'meal', 13, '마파두부 · 산동식 마늘쫑면', 'https://map.kakao.com/link/search/을지%20장만옥', true
),
(
  'manual-euljiro-sancheong-sutbul', '산청숯불가든 을지로', '음식점 > 한식 > 고기구이',
  '서울 중구 을지로 114-6 1층', '02-2273-8188',
  'meal', 12, '재래식 소금구이 · 항정살', 'https://map.kakao.com/link/search/산청숯불가든%20을지로', true
),
(
  'manual-euljiro-jakupjang', '을지 작업장', '음식점 > 한식 > 곱창',
  '서울 중구 충무로5길 26 1층', '0507-1361-7291',
  'meal', 13, '한우곱창모듬 · 곱개장전골', 'https://map.kakao.com/link/search/을지%20작업장', true
),
(
  'manual-euljiro-kkankkan', '을지깐깐', '음식점 > 베트남음식 > 쌀국수',
  '서울 중구 을지로12길 12, 202호', '010-5421-6788',
  'meal', 13, '게살국수 · 반쎄오', 'https://map.kakao.com/link/search/을지깐깐', true
),
(
  'manual-euljiro-corner-shop', '코너숍', '음식점 > 이자카야 > 하이볼바',
  '서울 중구 을지로12길 15 1층', '0507-1420-1291',
  'meal', 13, '시그니처 하이볼 · 고등어 봉초밥', 'https://map.kakao.com/link/search/코너숍%20을지로', true
),
(
  'manual-euljiro-ob-bear', '을지OB베어', '음식점 > 호프 > 노가리',
  '서울 중구 충무로 49-2 1층', '0507-1384-2566',
  'meal', 12, '노가리 & 황태', 'https://map.kakao.com/link/search/을지OB베어', true
),
(
  'manual-euljiro-champ-coffee', '챔프커피 제3작업실', '카페 > 커피 > 로스터리',
  '서울 중구 을지로157 라연 3F 381호', '010-8943-4516',
  'cafe', 14, '챔프커피(시그니처 드립)', 'https://map.kakao.com/link/search/챔프커피%20제3작업실', true
),
(
  'manual-euljiro-gyeongil-pizzeria', '경일옥 핏제리아', '음식점 > 양식 > 화덕피자',
  '서울 중구 을지로16길 2-1', '0507-1314-9015',
  'meal', 13, '나폴리 화덕피자', 'https://map.kakao.com/link/search/경일옥%20핏제리아', true
),
(
  'manual-euljiro-inhyeon-golbang', '인현골방', '음식점 > 칵테일바',
  '서울 중구 마른내로 60-1 2F', '0507-1419-8720',
  'meal', 14, null, 'https://map.kakao.com/link/search/인현골방', true
),
(
  'manual-euljiro-george', '죠지', '카페 > 디저트',
  '서울 중구 을지로12길 6 한일빌딩 302호', '010-6208-6326',
  'cafe', 13, '퓨로롱 젤리음료 · 핑키밍키브라우니', 'https://map.kakao.com/link/search/죠지%20을지로', true
),
(
  -- 주의: 인스타그램 공지 기준 주말 한정 운영으로 확인됨 — 카테고리에 표기해둠.
  'manual-euljiro-baekdusan', '백두강산', '카페 > 레트로 핸드드립 (주말 한정 운영 확인 필요)',
  '서울 중구 수표로 22-6 3층', '0507-1304-7061',
  'cafe', 14, '아메리카노 · 치즈케이크', 'https://map.kakao.com/link/search/백두강산%20을지로', true
),
(
  'manual-euljiro-coffee-hanyakbang', '커피한약방', '카페 > 레트로 카페',
  '서울 중구 삼일대로12길 16-6', '070-4148-4242',
  'cafe', 15, '필터커피 · 수정과인가베', 'https://map.kakao.com/link/search/커피한약방', true
),
(
  'manual-euljiro-pachinko', '파친코 을지로점', '음식점 > 이자카야',
  '서울 중구 수표로 48-1 103호', '0507-1302-4029',
  'meal', 14, '크리무짬뽕 · 마라야끼소바', 'https://map.kakao.com/link/search/파친코%20을지로점', true
),
(
  'manual-euljiro-lasvegas', '을지로 라스베가스', '음식점 > 이자카야',
  '서울 중구 을지로12길 28, 1층 104호', '0507-1392-2123',
  'meal', 13, '니쿠도후 · 을지로세트', 'https://map.kakao.com/link/search/을지로%20라스베가스', true
),
(
  'manual-euljiro-robatakami', '로바타카미', '음식점 > 일식 > 이자카야',
  '서울 중구 수표로 42-9 1층', '02-2275-3806',
  'meal', 14, '모모시오야끼 · 야끼소바', 'https://map.kakao.com/link/search/로바타카미', true
),
(
  'manual-euljiro-ohayo', '오하이요 을지로3가점', '음식점 > 이자카야',
  '서울 중구 수표로 48-14 1·2층', '02-6958-5500',
  'meal', 14, '점보 가라아게 · 스키야키나베', 'https://map.kakao.com/link/search/오하이요%20을지로3가점', true
),
(
  -- 을지로4가 소재라 나머지보다 다소 멀어서 도보 시간을 좀 더 넉넉히 잡음.
  'manual-euljiro-dabang', '을지다방', '카페 > 전통찻집',
  '서울 중구 을지로33길 31', '02-2265-7571',
  'cafe', 16, '쌍화차(계란노른자) · 인삼차', 'https://map.kakao.com/link/search/을지다방', true
)

on conflict (kakao_place_id) do nothing;
