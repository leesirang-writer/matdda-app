import { loginOrRegister } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>
        맛따라 멋따라
      </h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 24, lineHeight: 1.6 }}>
        사내 이메일로 시작하세요. 비밀번호는 없어요 — 다음에도 같은 이메일로
        들어오면 이어집니다.
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

      <form
        action={loginOrRegister}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <label style={labelStyle}>
          사내 이메일
          <input
            name="email"
            type="email"
            placeholder="hong@kpr.co.kr"
            required
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          이름
          <input
            name="name"
            type="text"
            placeholder="홍길동"
            required
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          별명 (선택 — 리뷰를 익명처럼 남기고 싶을 때 대신 보여줍니다)
          <input
            name="nickname"
            type="text"
            placeholder="예: 총무팀요정"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          소속 부서
          <input
            name="department"
            type="text"
            placeholder="총무팀"
            required
            style={inputStyle}
          />
        </label>
        <button type="submit" style={buttonStyle}>
          시작하기
        </button>
      </form>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13.5,
  fontWeight: 700,
  color: "#333",
};
const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  padding: "11px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  fontSize: 14,
  boxSizing: "border-box",
};
const buttonStyle: React.CSSProperties = {
  marginTop: 8,
  padding: "13px 0",
  borderRadius: 12,
  border: "none",
  background: "#6C4CD8",
  color: "#fff",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
};
