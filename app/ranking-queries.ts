import { sql } from "@/lib/db";
import type { RankingItem, RankingKind } from "./ranking-display";

export type { RankingItem, RankingKind } from "./ranking-display";

// 2026-09-16(19차): 좌측 사이드바 하단 "🏆 KPR 주간 랭킹 TOP 5" 위젯.
// "정직한 데이터" 원칙에 맞춰 진짜로 최근 7일(reviews.created_at 기준) 안에
// 달린 원터치 반응만 집계한다 — place_stats 뷰는 전체 기간 누적이라 여기
// 목적과 안 맞아서 쓰지 않고, 이 쿼리에서 직접 7일 윈도우로 다시 계산한다.
// 정렬 기준은 사용자 요청 그대로: "투표 수(again_count) / 재방문율 순, 없으면
// 도보 시간 가까운 순" — 이 세 키를 한 번에 order by에 넣으면 투표가 아직
// 하나도 없는 장소(오픈 초기엔 흔함)는 자연히 도보시간 순으로 정렬된다.
export async function getWeeklyRanking(kind: RankingKind): Promise<RankingItem[]> {
  const placeTypes = kind === "meal" ? ["meal", "both"] : ["cafe", "both"];

  const rows = await sql`
    select
      pl.id, pl.name, pl.walk_minutes, pl.signature_menu,
      coalesce(w.review_count, 0) as review_count,
      coalesce(w.again_count, 0) as again_count,
      w.again_rate
    from places pl
    left join lateral (
      select
        count(r.id) as review_count,
        count(*) filter (where r.verdict = 'again') as again_count,
        round(
          count(*) filter (where r.verdict = 'again')::numeric
          / nullif(count(r.id), 0) * 100, 1
        ) as again_rate
      from reviews r
      where r.place_id = pl.id and r.status = 'published'
        and r.created_at >= now() - interval '7 days'
    ) w on true
    where pl.place_type = any(${placeTypes}::text[]) and pl.walk_minutes is not null
    order by coalesce(w.again_count, 0) desc, coalesce(w.again_rate, -1) desc, pl.walk_minutes asc
    limit 5
  `;

  return (rows as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    walk_minutes: r.walk_minutes == null ? null : Number(r.walk_minutes),
    signature_menu: (r.signature_menu as string) ?? null,
    again_count: Number(r.again_count ?? 0),
    again_rate: r.again_rate == null ? null : Number(r.again_rate),
    review_count: Number(r.review_count ?? 0),
  }));
}
