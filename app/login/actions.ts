"use server";

import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { setSessionProfileId } from "@/lib/session";

const KPR_EMAIL_RE = /^[^\s@]+@kpr\.co\.kr$/i;

export async function loginOrRegister(formData: FormData) {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const name = formData.get("name")?.toString().trim() ?? "";
  const nicknameRaw = formData.get("nickname")?.toString().trim() ?? "";
  const nickname = nicknameRaw.length > 0 ? nicknameRaw : null;
  const department = formData.get("department")?.toString().trim() ?? "";

  if (!KPR_EMAIL_RE.test(email)) {
    redirect(
      "/login?error=" +
        encodeURIComponent("사내 이메일(@kpr.co.kr)로만 이용할 수 있어요.")
    );
  }
  if (!name) {
    redirect("/login?error=" + encodeURIComponent("이름을 입력해주세요."));
  }
  if (!department) {
    redirect("/login?error=" + encodeURIComponent("소속 부서를 입력해주세요."));
  }

  // 이미 있는 이메일이면 정보만 최신화, 없으면 새로 만듭니다.
  // (비밀번호가 없으므로 "같은 이메일 = 같은 사람"으로 취급합니다)
  const existing = await sql`
    select id from profiles where email = ${email} limit 1
  `;

  let profileId: string;
  if (existing.length > 0) {
    profileId = existing[0].id as string;
    await sql`
      update profiles
      set name = ${name}, nickname = ${nickname}, department = ${department}, updated_at = now()
      where id = ${profileId}
    `;
  } else {
    const created = await sql`
      insert into profiles (email, name, nickname, department)
      values (${email}, ${name}, ${nickname}, ${department})
      returning id
    `;
    profileId = created[0].id as string;
  }

  await setSessionProfileId(profileId);
  redirect("/reviews/new");
}
