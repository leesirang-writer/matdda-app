-- Neon SQL Editor(또는 psql)에서 실행하고 결과를 그대로 복사해서 보여주세요.
-- 실제 컬럼 구조가 코드가 기대하는 것과 다르면 바로 맞춰드릴게요.

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'profiles', 'places', 'reviews', 'review_photos',
    'tags', 'review_tags', 'review_helpful_votes',
    'recommendation_logs', 'courses'
  )
order by table_name, ordinal_position;

-- 참고: places에 실제로 90행이 들어있는지도 같이 확인됩니다.
select 'places_count' as check_name, count(*) from public.places;
