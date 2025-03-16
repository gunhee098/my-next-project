import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("🚨 DATABASE_URL이 설정되지 않았습니다! `.env` 파일을 확인하세요.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ PostgreSQL DB 연결 성공!");
    client.release();
  } catch (error) {
    console.error("🚨 PostgreSQL DB 연결 실패!", error);
  }
})();

export async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        userId INT NOT NULL
      )
    `);
    console.log("✅ posts 테이블이 정상적으로 생성되었습니다!");
  } catch (error) {
    console.error("🚨 posts 테이블 생성 실패!", error);
  }
}

export default pool;