import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function middleware(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "인증이 필요합니다!" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1]; // "Bearer <token>" 형태에서 <token> 추출

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
    req.headers.set("user", JSON.stringify(decoded)); // ✅ 유저 정보 저장
    return NextResponse.next();
  } catch (error) {
    console.error("JWT 검증 실패:", error);
    return NextResponse.json({ error: "유효하지 않은 토큰입니다!" }, { status: 403 });
  }
}

export const config = {
  matcher: ["/api/posts/:path*", "/api/user"], // ✅ 게시글 API & 유저 정보 API만 인증 필요
};