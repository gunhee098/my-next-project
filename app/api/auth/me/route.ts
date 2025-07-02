// 📂 app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server"; // Next.jsのAPIルートのためのモジュール
import jwt from "jsonwebtoken"; // JWT (JSON Web Token) を扱うためのライブラリ

// GETリクエストハンドラー
// リクエストヘッダーから認証トークンを取得し、そのトークンを検証してユーザーIDを返します。
export async function GET(req: NextRequest) {
  try {
    // ⚡ 1. Authorizationヘッダーからトークンを取得
    const authHeader = req.headers.get("authorization");
    // Authorizationヘッダーが存在しない場合
    if (!authHeader) {
      return NextResponse.json({ error: "トークンがありません！" }, { status: 401 }); // エラーメッセージ
    }

    // "Bearer トークン値" の形式からトークン値のみを抽出
    const token = authHeader.split(" ")[1];

    // ⚡ 2. JWTトークンの検証
    // 環境変数JWT_SECRETを使用してトークンを検証します。
    // 開発環境用の"default_secret"は、本番環境では必ず強力な秘密鍵に置き換えるべきです。
    // デコードされたIDの型をstringに変更しました。
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as { id: string; email: string };

    // トークンが有効にデコードされない場合（検証失敗など）
    if (!decoded) {
      return NextResponse.json({ error: "無効なトークンです！" }, { status: 401 }); // エラーメッセージ
    }

    // ⚡ 3. デコードされたトークンからユーザーIDを抽出し、返却
    return NextResponse.json({ userId: decoded.id }, { status: 200 });
  } catch (error) {
    // トークン検証中にエラーが発生した場合（例: トークンが無効または期限切れ）
    console.error("🚨 トークン検証失敗:", error); // コンソールエラーメッセージ
    return NextResponse.json({ error: "サーバーエラーが発生しました！" }, { status: 500 }); // エラーメッセージ
  }
}