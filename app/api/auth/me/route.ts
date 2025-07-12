// 📂 app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server"; // Next.jsのAPIルートのためのモジュール
import jwt from "jsonwebtoken"; // JWT (JSON Web Token) を扱うためのライブラリ

// 📂 app/api/auth/me/route.ts
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "トークンがありません！" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as { id: string; email: string };

    if (!decoded) {
      return NextResponse.json({ error: "無効なトークンです！" }, { status: 401 });
    }

    // ⚡ 여기를 수정: User 객체 형태로 반환
    return NextResponse.json({ 
      id: decoded.id,
      email: decoded.email,
      // name이 토큰에 있다면 추가
      // name: decoded.name 
    }, { status: 200 });

  } catch (error) {
    console.error("🚨 トークン検証失敗:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました！" }, { status: 500 });
  }
}