import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

export async function GET(req: Request) {
  try {
    // 🔹 1️⃣ Authorization 헤더에서 토큰 가져오기
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "인증 토큰이 필요합니다." }, { status: 401 });
    }

    // 🔹 2️⃣ 토큰 값 추출
    const token = authHeader.split(" ")[1];

    // 🔹 3️⃣ JWT 검증
// 🔹 3️⃣ JWT 검증
const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as jwt.JwtPayload;

if (!decoded.id) {
  return NextResponse.json({ error: "유효하지 않은 토큰입니다. ID 없음" }, { status: 401 });
}
    // 🔹 4️⃣ DB에서 사용자 정보 가져오기
    const client = await pool.connect();
    let user;
    try {
      const result = await client.query("SELECT id, username, email FROM users WHERE id = $1", [decoded.id]);
      user = result.rows[0];
    } finally {
      client.release();
    }

    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ message: "인증 성공!", user }, { status: 200 });

  } catch (error) {
    console.error("JWT 인증 실패:", error);
    return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
  }
}