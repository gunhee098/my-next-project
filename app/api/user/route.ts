import { NextResponse } from "next/server"; // Next.jsのAPIルートからのレスポンスを扱うためのモジュール
import jwt from "jsonwebtoken"; // JWT (JSON Web Token) を扱うためのライブラリ
import pool from "@/lib/db"; // データベース接続プールをインポート (PostgreSQLなど)

// GETリクエストハンドラー
// 認証トークンを検証し、トークンに紐づくユーザー情報を返します。
export async function GET(req: Request) {
  try {
    // 🔹 1️⃣ Authorizationヘッダーから認証トークンを取得
    const authHeader = req.headers.get("authorization");
    // Authorizationヘッダーが存在しない、または"Bearer "で始まらない場合
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "認証トークンが必要です。" }, { status: 401 }); 
    }

    // 🔹 2️⃣ トークン文字列を抽出 ("Bearer " の後から)
    const token = authHeader.split(" ")[1];

    // 🔹 3️⃣ JWTトークンの検証
    // 環境変数からJWTシークレットを取得し、トークンを検証します。
    // 開発環境用の"default_secret"は、本番環境では必ず強力な秘密鍵に置き換えるべきです。
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as jwt.JwtPayload;

    // デコードされたトークンにユーザーIDが含まれていない場合
    if (!decoded.id) {
      return NextResponse.json({ error: "無効なトークンです。ユーザーIDが見つかりません。" }, { status: 401 }); 
    }

    // 🔹 4️⃣ データベースからユーザー情報を取得
    const client = await pool.connect(); // データベース接続プールからクライアントを取得
    let user;
    try {
      // デコードされたIDを使用してusersテーブルからユーザーID、ユーザー名、メールアドレスを検索
      const result = await client.query("SELECT id, username, email FROM users WHERE id = $1", [decoded.id]);
      user = result.rows[0]; // 最初の行（ユーザー情報）を取得
    } finally {
      client.release(); // データベースクライアントをプールに返却 (重要: 接続リーク防止)
    }

    // ユーザーが見つからない場合
    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりませんでした。" }, { status: 404 }); 
    }

    // 認証成功のレスポンスを返却
    return NextResponse.json({ message: "認証に成功しました！", user }, { status: 200 }); 

  } catch (error) {
    // JWT検証失敗、またはその他のエラーが発生した場合
    console.error("JWT認証失敗:", error); 
    // 無効なトークンとしてエラーレスポンスを返却
    return NextResponse.json({ error: "無効なトークンです。" }, { status: 401 }); 
  }
}