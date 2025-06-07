import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

// ミドルウェア関数
// 特定のAPIルートへのリクエストを認証するために使用されます。
export function middleware(req: NextRequest) {
  // Authorizationヘッダーから認証トークンを取得
  const authHeader = req.headers.get("Authorization");

  // Authorizationヘッダーがない、または"Bearer "で始まらない場合
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // 認証エラーを返す
    return NextResponse.json({ error: "認証が必要です！" }, { status: 401 });
  }

  // "Bearer <token>"形式からトークン部分を抽出
  const token = authHeader.split(" ")[1];

  try {
    // JWTトークンを検証
    // 環境変数にJWT_SECRETが設定されていない場合は、"default_secret"を使用
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
    
    // 検証済みユーザー情報をリクエストヘッダーに保存し、次の処理へ進む
    // これにより、APIルート内でユーザー情報にアクセスできるようになります。
    req.headers.set("user", JSON.stringify(decoded));
    return NextResponse.next();
  } catch (error) {
    // JWT検証に失敗した場合
    console.error("JWT検証失敗:", error); // エラーをコンソールに出力
    // 無効なトークンエラーを返す
    return NextResponse.json({ error: "無効なトークンです！" }, { status: 403 });
  }
}

// ミドルウェアの適用パス設定
// 指定されたパスにのみミドルウェアが適用されます。
export const config = {
  // "/api/posts/"で始まるすべてのパスと"/api/user"パスに認証を適用
  matcher: ["/api/posts/:path*", "/api/user"],
};