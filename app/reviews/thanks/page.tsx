import Link from "next/link";

export default function ThanksPage() {
  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 40 }}>🎉</div>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginTop: 12 }}>
        리뷰 감사합니다!
      </h1>
      <p style={{ fontSize: 14, color: "#666", margin: "12px 0 28px" }}>
        동료들이 다음에 그 앞에서 고민할 때 큰 도움이 될 거예요.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "12px 22px",
            borderRadius: 12,
            background: "#6C4CD8",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          홈 화면으로 가기
        </Link>
        <Link
          href="/reviews/new"
          style={{
            display: "inline-block",
            padding: "10px 0",
            color: "#6C4CD8",
            fontWeight: 600,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          다른 곳 리뷰도 쓰기
        </Link>
      </div>
    </main>
  );
}
