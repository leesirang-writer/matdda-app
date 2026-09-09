import { sql } from "@/lib/db";
import { ReviewForm } from "./review-form";

// 2026-09-09(8차, 완전 익명 리뷰 전환): 이메일 로그인/프로필 조회를 전부
// 없앴다 — 이 페이지는 이제 누가 들어오든(로그인 여부와 무관하게, QR/링크로
// 처음 온 사람도) 곧바로 리뷰 작성 폼을 보여준다.
export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; place_id?: string }>;
}) {
  const params = await searchParams;

  const places = (await sql`
    select id, name, place_type, category, road_address as address, walk_minutes
    from places
    order by name asc
  `) as {
    id: string;
    name: string;
    place_type: "meal" | "cafe" | "both";
    category: string | null;
    address: string | null;
    walk_minutes: number | null;
  }[];

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 90px" }}>
      <h1 style={{ fontSize: 19, fontWeight: 800 }}>리뷰 남기기</h1>
      <p style={{ fontSize: 12, color: "#999", marginBottom: 20 }}>
        로그인도 이메일도 필요 없어요. 10초면 충분합니다 — 사진과 자세한 정보는
        전부 선택이에요.
      </p>

      {params.error && (
        <div
          style={{
            background: "#fdeaea",
            color: "#c0392b",
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {params.error}
        </div>
      )}

      <ReviewForm places={places} initialPlaceId={params.place_id} />
    </main>
  );
}
