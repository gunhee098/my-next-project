import jwt, { JwtPayload } from "jsonwebtoken";
import { NextRequest } from "next/server";

// JWTトークンを検証する関数
// 環境変数 JWT_SECRET を使用してトークンの正当性を確認します。
// @param token - 検証するJWT文字列
// @returns 検証に成功した場合はデコードされたペイロード (JwtPayload 型)、失敗した場合は null
export function verify(token: string): JwtPayload | null {
  try {
    // JWT_SECRET が設定されていない場合、"default_secret" を使用してトークンを検証
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");

    // デコードされた結果がオブジェクトであり、かつ 'id' プロパティを持つことを確認
    if (typeof decoded === "object" && "id" in decoded) {
      return decoded as JwtPayload; // JwtPayload型としてキャストして返す
    }
    return null; // idプロパティがない場合はnullを返す
  } catch (error) {
    // JWT認証が失敗した場合のエラーハンドリング
    console.error("🚨 JWT認証失敗:", error); // エラーをコンソールに出力
    return null; // エラー発生時はnullを返す
  }
}

// ユーザーを認証し、ユーザーIDを返す関数
// Next.jsのリクエストオブジェクトからAuthorizationヘッダーを読み取り、JWTを検証します。
// @param req - Next.jsのNextRequestオブジェクト
// @returns 認証されたユーザーのID（数値型）
// @throws 認証ヘッダーがない、トークンが無効な場合
export function authenticateUser(req: NextRequest): number {
  // Authorizationヘッダーから"Bearer <token>"形式の文字列を取得
  const authHeader = req.headers.get("Authorization");
  // ヘッダーからトークン部分（"Bearer "以降）を抽出
  const token = authHeader?.split(" ")[1];

  // トークンが存在しない場合、エラーをスロー
  if (!token) {
    throw new Error("ログインが必要です！");
  }

  // 取得したトークンを検証
  const userData = verify(token);
  // ユーザーデータが有効でない、またはユーザーIDが数値でない場合、エラーをスロー
  if (!userData || typeof userData.id !== "number") {
    throw new Error("無効なトークンです！");
  }

  // 認証されたユーザーのIDを数値型で返す
  return Number(userData.id);
}