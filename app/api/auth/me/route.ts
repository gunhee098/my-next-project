// 📂 app/api/auth/me/route.ts

// Next.jsのAPIルートのためのモジュールをインポートします。
import { NextRequest, NextResponse } from "next/server";
// JWT (JSON Web Token) を扱うためのライブラリをインポートします。
import jwt from "jsonwebtoken";

/**
 * GETリクエストハンドラ
 * 認証ヘッダーからJWTトークンを検証し、ユーザー情報を返します。
 * @param {NextRequest} req - 受信したNext.jsのリクエストオブジェクト
 * @returns {NextResponse} レスポンスオブジェクト
 */
export async function GET(req: NextRequest) {
  try {
    // リクエストヘッダーからAuthorizationヘッダーを取得します。
    const authHeader = req.headers.get("authorization");
    // Authorizationヘッダーがない場合、トークンがないエラーを返します。
    if (!authHeader) {
      return NextResponse.json({ error: "トークンがありません。" }, { status: 401 });
    }

    // Authorizationヘッダーから「Bearer 」を取り除き、トークン部分のみを抽出します。
    const token = authHeader.split(" ")[1];
    // JWTトークンを検証します。
    // 環境変数にJWTシークレットが設定されていない場合、"default_secret"を使用します。
    // 復号化されたペイロードは、idとemailプロパティを持つ型にキャストされます。
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as { id: string; email: string };

    // トークンが有効でなかった場合、無効なトークンエラーを返します。
    if (!decoded) {
      return NextResponse.json({ error: "無効なトークンです。" }, { status: 401 });
    }

    // ユーザー情報をUserオブジェクトの形式で返します。
    // ここでnameプロパティもトークンに含まれていれば追加できます。
    return NextResponse.json({
      id: decoded.id,
      email: decoded.email,
      // nameがトークンに含まれていれば、以下のように追加できます。
      // name: decoded.name
    }, { status: 200 });

  } catch (error) {
    // トークンの検証中にエラーが発生した場合、コンソールにエラーを出力します。
    console.error("🚨 トークン検証失敗:", error);
    // サーバーエラーレスポンスを返します。
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}