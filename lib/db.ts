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
export const sql = neon(process.env.DATABASE_URL);
