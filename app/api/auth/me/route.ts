// 📂 app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  try {
    // 🔥 1. Authorization 헤더에서 토큰 가져오기
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "토큰이 없습니다!" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1]; // "Bearer 토큰값"에서 토큰값만 추출

    // 🔥 2. 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as { id: number; email: string };

    if (!decoded) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다!" }, { status: 401 });
    }

    // 🔥 3. 유저 ID 반환
    return NextResponse.json({ userId: decoded.id }, { status: 200 });
  } catch (error) {
    console.error("🚨 토큰 검증 실패:", error);
    return NextResponse.json({ error: "서버 오류 발생!" }, { status: 500 });
  }
}
