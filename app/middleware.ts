// 📂 middleware.ts (いいね機能再修正バージョン)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

// JWT トークン デコーディング インターフェース (app/blog/page.tsxと同じ定義を使用)
interface DecodedToken {
  id: string;    // ユーザーID (PrismaのUUIDに合わせ string タイプ)
  email: string;
  name: string;
  iat: number;   // トークン発行時間 (Issued At)
  exp: number;   // トークン有効期限 (Expiration Time)
}

/**
 * Next.js のミドルウェア関数
 * リクエストがサーバーに到達する前に、認証とルーティングのロジックを処理します。
 * @param {NextRequest} req - 受信したNext.jsリクエストオブジェクト
 * @returns {NextResponse} 処理されたレスポンス
 */
export function middleware(req: NextRequest) {
  // Authorizationヘッダーからトークンを抽出します。
  let token: string | null = null;
  const authHeader = req.headers.get("Authorization");
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1]; // "Bearer " の後に続く部分をトークンとして取得
  } else {
    // Authorizationヘッダーがない場合、クッキーも確認します (JWTトークンをクッキーに保存する構成の場合)。
    // 現在のフロントエンドは localStorage を使用していますが、万一の場合に備えた防御ロジックです。
    token = req.cookies.get("token")?.value || null;
  }

  // 環境変数 JWT_SECRET が設定されているか確認します。
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("ミドルウェア: 環境変数 JWT_SECRET が設定されていません。");
    // APIルートへのアクセスの場合、エラーJSONを返します。
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "サーバー設定エラー: JWT_SECRETがありません。" }, { status: 500 });
    }
    // それ以外のページアクセスの場合、ログインページにリダイレクトします。
    const loginUrl = new URL("/", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  // アクセス中のパスを判別します。
  const currentPath = req.nextUrl.pathname;
  const isApiPath = currentPath.startsWith("/api/");        // APIルートかどうか
  const isLoginPage = currentPath === "/";                  // ログインページかどうか
  
  // ログイン/登録関連のAPIはトークン保護の対象外とします。
  const isAuthApi = currentPath === "/api/auth" || currentPath === "/api/register"; 

  // 1. APIルート保護ロジック
  // APIルートであり、かつ認証関連のAPIではない場合
  if (isApiPath && !isAuthApi) {
    // --- デバッグ用コンソールログ開始 ---
    console.log("--- ミドルウェアデバッグ: 保護されたAPIルート ---");
    console.log("ミドルウェア: アクセス中のAPIルート:", currentPath);
    console.log("ミドルウェア: 受信したAuthorizationヘッダー:", authHeader);
    console.log("ミドルウェア: 抽出されたトークン (処理後):", token ? token.substring(0, 10) + '...' : "トークンなし");
    // --- デバッグ用コンソールログ終了 ---

    // トークンがない場合、認証エラーを返します。
    if (!token) {
      console.warn(`ミドルウェア: APIルート (${currentPath}): トークンがありません。`);
      return NextResponse.json({ error: "認証が必要です！" }, { status: 401 });
    }

    try {
      // トークンを検証し、デコードします。
      const decoded = jwt.verify(token, jwtSecret) as DecodedToken;
      console.log(`ミドルウェア: APIルート (${currentPath}): JWT検証成功。デコードされたユーザーID:`, decoded.id);

      // リクエストヘッダーにユーザー情報を追加して、APIルートに渡します。
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("user", JSON.stringify({ id: decoded.id, email: decoded.email, name: decoded.name }));
      
      // 次の処理へ進みます（APIハンドラーへ）。
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      // JWT検証に失敗した場合、無効なトークンエラーを返します。
      console.error(`ミドルウェア: APIルート (${currentPath}) のJWT検証に失敗しました:`, (error as Error).message);
      return NextResponse.json({ error: "無効なトークンです！" }, { status: 403 });
    }
  }

  // 2. ページルート保護ロジック
  // APIルートではなく、かつログインページ(/)ではない全てのページは保護対象とします。
  // (app/blog/new, app/blog/[id] などを含みます)
  if (!isApiPath && !isLoginPage) { 
    // --- デバッグ用コンソールログ開始 ---
    console.log("--- ミドルウェアデバッグ: 保護されたページルート ---");
    console.log("ミドルウェア: アクセス中のページルート:", currentPath);
    console.log("ミドルウェア: 受信したAuthorizationヘッダー:", authHeader);
    console.log("ミドルウェア: 抽出されたトークン (処理後):", token ? token.substring(0, 10) + '...' : "トークンなし");
    // --- デバッグ用コンソールログ終了 ---

    // トークンがない場合、ログインページにリダイレクトします。
    if (!token) {
      console.warn(`ミドルウェア: ページルート (${currentPath}): トークンがありません。ログインページにリダイレクトします。`);
      const loginUrl = new URL("/", req.nextUrl.origin);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // トークンを検証し、デコードします。
      const decoded = jwt.verify(token, jwtSecret) as DecodedToken;
      console.log(`ミドルウェア: ページルート (${currentPath}): JWT検証成功。デコードされたユーザーID:`, decoded.id);
      
      // リクエストヘッダーにユーザー情報を追加して、ページコンポーネントに渡します。
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("user", JSON.stringify({ id: decoded.id, email: decoded.email, name: decoded.name }));
      
      // 次の処理へ進みます（ページコンポーネントのレンダリングへ）。
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      // JWT検証に失敗した場合、ログインページにリダイレクトします。
      console.error(`ミドルウェア: ページルート (${currentPath}) のJWT検証に失敗しました:`, (error as Error).message);
      const loginUrl = new URL("/", req.nextUrl.origin);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ログインページ(/)や認証APIはそのまま通過させます。
  console.log("ミドルウェア: 非保護ルートまたは認証済みルートを通過:", currentPath);
  return NextResponse.next();
}

/**
 * ミドルウェアの適用パス設定
 * ここで指定されたパスパターンに合致するリクエストに対してミドルウェアが実行されます。
 */
export const config = {
  matcher: [
    // /api/ で始まるすべてのパス (API認証用)
    "/api/:path*", 
    // /blog で始まるすべてのパス (ページ認証用)
    "/blog/:path*", 
    // ルートパス (新しいログインページ)
    // ミドルウェアはこのパスにも適用されますが、内部ロジックで isLoginPage の場合は通過させます。
    "/",
  ],
};