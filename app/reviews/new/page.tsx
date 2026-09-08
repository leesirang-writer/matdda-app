import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSessionProfileId } from "@/lib/session";
import { ReviewForm } from "./review-form";

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; place_id?: string }>;
}) {
  const params = await searchParams;
  const profileId = await getSessionProfileId();
  if (!profileId) {
    redirect("/login");
  }

  const profiles = await sql`
    select id, name, nickname, department from profiles where id = ${profileId}
  `;
  if (profiles.length === 0) {
    // 쿠키는 있는데 프로필이 지워진 경우 (드문 케이스) — 다시 로그인하도록.
    redirect("/login");
  }
  const profile = profiles[0] as {
    id: string;
    name: string;
    nickname: string | null;
    department: string;
  };

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
      <p style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
        {profile.department} · {profile.name}님으로 작성해요
      </p>
      <p style={{ fontSize: 12, color: "#999", marginBottom: 20 }}>
        1분이면 충분해요. 사진은 없어도 괜찮습니다.
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

      <ReviewForm
        places={places}
        hasNickname={!!profile.nickname}
        initialPlaceId={params.place_id}
      />
    </main>
  );
}
