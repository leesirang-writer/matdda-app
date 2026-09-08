"use server";

import { sql } from "@/lib/db";
import { getSessionProfileId } from "@/lib/session";

// purpose enum(recommendation_logs.purpose)은 reviews와 동일하게
// client/remote_work/lunch/dinner/cafe 다섯 개뿐이라, "20대 동기들과 힙지로
// 핫플" 같은 상황은 실제로 채택된 장소의 place_type을 보고 가장 가까운 값으로
// 매핑한다(밥집이면 lunch/dinner 성격, 카페면 cafe).
function purposeForLog(situation: string, placeType: string): string {
  if (situation === "client") return "client";
  if (situation === "remote") return placeType === "cafe" ? "cafe" : "remote_work";
  if (situation === "speed") return "lunch";
  // trendy
  return placeType === "cafe" ? "cafe" : "dinner";
}

/**
 * "🎯 오늘 여기로 결정!" 버튼 — recommendation_logs에 채택 기록을 남긴다.
 * 로그인 안 한 상태(둘러보기는 로그인 없이도 볼 수 있음)여도 기록 자체는
 * user_id를 null로 남겨서 막지 않는다 — "추천 채택률"이라는 심사용 지표를
 * 최대한 놓치지 않고 쌓는 게 더 중요하기 때문.
 */
export async function decideRecommendation(formData: FormData) {
  const profileId = await getSessionProfileId();

  const situation = formData.get("situation")?.toString() ?? "";
  const timeBudget = formData.get("time_budget")?.toString() ?? "";
  const priceBudget = formData.get("price_budget")?.toString() ?? "";
  const selectedPlaceId = formData.get("selected_place_id")?.toString() ?? "";
  const placeType = formData.get("place_type")?.toString() ?? "meal";
  const recommendedIdsRaw = formData.get("recommended_place_ids")?.toString() ?? "";
  const recommendedIds = recommendedIdsRaw.split(",").filter((s) => s.length > 0);

  if (!selectedPlaceId) return { ok: false as const, error: "장소 정보가 없어요." };

  const purpose = purposeForLog(situation, placeType);

  try {
    // 이 드라이버(@neondatabase/serverless)는 JS 객체는 JSON.stringify로,
    // JS 배열은 Postgres 배열 리터럴로 자동 변환해서 바인딩하므로 그냥 그대로
    // 넘기면 된다(conditions는 jsonb, recommended_place_ids는 uuid[] 컬럼).
    await sql`
      insert into recommendation_logs (
        user_id, purpose, conditions, recommended_place_ids, selected_place_id
      )
      values (
        ${profileId},
        ${purpose},
        ${{ situation, time_budget: timeBudget, price_budget: priceBudget }},
        ${recommendedIds},
        ${selectedPlaceId}
      )
    `;
    return { ok: true as const };
  } catch (err) {
    console.error("추천 채택 기록 저장 실패:", err);
    return { ok: false as const, error: "기록 저장에 실패했어요." };
  }
}
