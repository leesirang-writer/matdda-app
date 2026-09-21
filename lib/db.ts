import { neon } from "@neondatabase/serverless";

// .env.local 에 Neon 콘솔에서 복사한 연결 문자열을 DATABASE_URL로 넣어주세요.
// 예: DATABASE_URL=postgresql://user:password@ep-xxxx.aws.neon.tech/dbname?sslmode=require
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL 환경변수가 없습니다. .env.local에 Neon 연결 문자열을 넣어주세요."
  );
}

// sql`select * from places where id = ${id}` 처럼 태그드 템플릿으로 씁니다.
// 값은 자동으로 이스케이프되므로 SQL 인젝션 걱정 없이 그대로 변수를 넣으면 됩니다.
//
// 2026-09-21(21차): "원터치 반응을 눌러서 Neon엔 실제로 잘 쌓이는데(SQL
// Editor로 직접 세어보면 늘어남), 정작 사이트를 새로고침하면 화면엔 다시
// 안 보임" 버그의 근본 원인 — @neondatabase/serverless의 neon()은 내부적으로
// HTTP 요청을 fetch()로 보내는데, Next.js는 렌더링 중에 일어나는 모든
// fetch() 호출을 자동으로 캐싱 대상으로 삼을 수 있다(호출부에서 직접
// 캐시 여부를 지정하지 않으면 프레임워크 기본값을 따름). 그 결과 "든든한
// 점심" 목록을 그리는 select 쿼리 자체가 어느 순간의 응답으로 캐시돼서,
// 실제 DB에는 새 반응이 쌓여도 화면은 캐시된 옛 결과를 계속 보여줄 수
// 있음 — insert는 매번 정상 실행되는데 그 직후의 select만 새로고침해도
// 안 바뀌는 것처럼 보이는 전형적인 증상과 정확히 일치함. `fetchOptions:
// { cache: "no-store" }`를 neon()에 직접 지정해서, 이 프로젝트의 모든
// DB 쿼리가 어떤 경우에도 캐시되지 않고 항상 Neon에 새로 요청하도록
// 명시적으로 고정한다(Neon 공식 문서가 Next.js App Router와 함께 쓸 때
// 권장하는 설정이기도 함).
export const sql = neon(process.env.DATABASE_URL, {
  fetchOptions: { cache: "no-store" },
});
