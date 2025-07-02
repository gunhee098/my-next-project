// 📂 app/lib/auth.ts
// このファイルには、JWT認証関連のユーティリティ関数が含まれています。

// [モジュールインポート]
import { NextRequest } from 'next/server'; // Next.js のリクエストオブジェクトを扱うためのモジュール
import { jwtVerify, JWTPayload } from 'jose'; // jose ライブラリを使用 (jsonwebtoken の代替として推奨される、より安全なライブラリ)
// import prisma from '@/lib/db'; // ⚠️ このファイルでは直接データベースアクセスがないため、この行は削除します。

// [型定義]
// JWT ペイロードにカスタムフィールドを追加するためのインターフェース
// Prisma の UUID に合わせて userId を string として定義
interface CustomJWTPayload extends JWTPayload {
  id: string; // ユーザーID (PrismaのUUIDに合わせ string タイプ)
  email: string; // ユーザーのメールアドレス
  name: string; // ユーザー名
}

/**
 * @function getJwtSecretKey
 * @description 環境変数からJWT Secret Keyを安全に取得し、Uint8Array形式で返します。
 * JWT_SECRETが設定されていない場合はエラーをスローします。
 * @returns {Uint8Array} JWT署名/検証に使用するシークレットキー
 */
const getJwtSecretKey = (): Uint8Array => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // JWT_SECRET が設定されていない場合、アプリケーションの起動時にこのエラーが確認されるべき
    throw new Error('JWT_SECRET 環境変数が設定されていません。');
  }
  return new TextEncoder().encode(secret); // Secret Key を Uint8Array (バイト配列) にエンコード
};

/**
 * @function authenticateUser
 * @description Next.js のリクエストオブジェクトから認証トークンを抽出し、
 * jose ライブラリを使用してJWTを検証し、認証済みユーザー情報を返します。
 * @param {NextRequest} req - Next.js のリクエストオブジェクト
 * @returns {{ userId: string; userEmail: string; userName: string } | null}
 * 認証成功時はユーザー情報、失敗時は null を返します。
 *
 * @attention 重要: この関数は主にトークン検証のみを行います。
 * データベースからのユーザー詳細情報が必要な場合は、APIルート側でprismaを使用して別途取得してください。
 */
export const authenticateUser = async (req: NextRequest): Promise<{ userId: string; userEmail: string; userName: string } | null> => {
  const authHeader = req.headers.get('Authorization'); // Authorization ヘッダーから認証情報を取得

  // [認証ヘッダーのバリデーション]
  // Authorization ヘッダーが存在しない、または "Bearer " で始まらない場合は認証失敗
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("認証失敗: Authorization ヘッダーがないか、Bearer トークンではありません。");
    return null;
  }

  const token = authHeader.split(' ')[1]; // "Bearer " プレフィックスを除去して、実際のトークン文字列を抽出

  try {
    // [JWTの検証]
    // getJwtSecretKey() で取得したシークレットキーを使用してトークンを検証し、ペイロードを抽出
    const { payload } = await jwtVerify(token, getJwtSecretKey()) as { payload: CustomJWTPayload };
    console.log("✔ JWT検証成功。ユーザーID (JWT ペイロードから抽出):", payload.id);

    // ペイロードから必要なユーザー情報を抽出し、オブジェクトとして返却
    return {
      userId: payload.id,
      userEmail: payload.email,
      userName: payload.name,
    };
  } catch (error) {
    // [エラーハンドリング - JWT検証失敗時]
    // トークンが無効（期限切れ、不正な署名など）な場合にエラーを捕捉
    console.error("🚨 JWT検証失敗:", error);
    return null;
  }
};