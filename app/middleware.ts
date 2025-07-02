// 📂 middleware.ts (좋아요 기능 재수정 버전)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

// JWT トークン デコーディング インターフェース (app/blog/page.tsxと同じ定義を使用)
interface DecodedToken {
  id: string; // ユーザーID (PrismaのUUIDに合わせ string タイプ)
  email: string;
  name: string;
  iat: number; // トークン発行時間
  exp: number; // トークン有効期限
}

// ミドルウェア関数
export function middleware(req: NextRequest) {
  // Authorizationヘッダーからトークンを抽出
  let token: string | null = null;
  const authHeader = req.headers.get("Authorization");
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else {
    // Authorizationヘッダーがない場合、クッキーも確認 (JWTトークンをクッキーに保存する構成の場合)
    // 현재 프론트엔드는 localStorage를 사용하지만, 혹시 모를 경우를 대비한 방어 로직
    token = req.cookies.get("token")?.value || null;
  }

  // JWT_SECRET が設定されているか確認
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("ミドルウェア: 環境変数 JWT_SECRET が設定されていません。");
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "サーバー設定エラー: JWT_SECRETがありません。" }, { status: 500 });
    }
    const loginUrl = new URL("/", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  // アクセス中のパスを判別
  const currentPath = req.nextUrl.pathname;
  const isApiPath = currentPath.startsWith("/api/");
  const isLoginPage = currentPath === "/";
  
  // ログイン/登録関連のAPIはトークン保護の対象外とする
  const isAuthApi = currentPath === "/api/auth" || currentPath === "/api/register"; 

  // 1. APIルート保護ロジック
  if (isApiPath && !isAuthApi) {
    // --- デバッグ用コンソールログ開始 ---
    console.log("--- ミドルウェアデバッグ: 保護されたAPIルート ---");
    console.log("ミドルウェア: アクセス中のAPIルート:", currentPath);
    console.log("ミドルウェア: 受信したAuthorizationヘッダー:", authHeader);
    console.log("ミドルウェア: 抽出されたトークン (処理後):", token ? token.substring(0, 10) + '...' : "トークンなし");
    // --- デバッグ用コンソールログ終了 ---

    if (!token) {
      console.warn(`ミドルウェア: APIルート (${currentPath}): トークンがありません。`);
      return NextResponse.json({ error: "認証が必要です！" }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as DecodedToken;
      console.log(`ミドルウェア: APIルート (${currentPath}): JWT検証成功。デコードされたユーザーID:`, decoded.id);

      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("user", JSON.stringify({ id: decoded.id, email: decoded.email, name: decoded.name }));
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error(`ミドルウェア: APIルート (${currentPath}) のJWT検証に失敗しました:`, (error as Error).message);
      return NextResponse.json({ error: "無効なトークンです！" }, { status: 403 });
    }
  }

  // 2. ページルート保護ロジック
  // ログインページ(/)以外の全てのページは保護対象
  // (app/blog/new, app/blog/[id] 등 포함)
  if (!isApiPath && !isLoginPage) { 
    // --- デバッグ用コンソールログ開始 ---
    console.log("--- ミドルウェアデバッグ: 保護されたページルート ---");
    console.log("ミドルウェア: アクセス中のページルート:", currentPath);
    console.log("ミドルウェア: 受信したAuthorizationヘッダー:", authHeader);
    console.log("ミドルウェア: 抽出されたトークン (処理後):", token ? token.substring(0, 10) + '...' : "トークンなし");
    // --- デバッグ用コンソールログ終了 ---

    if (!token) {
      console.warn(`ミドルウェア: ページルート (${currentPath}): トークンがありません。ログインページにリダイレクトします。`);
      const loginUrl = new URL("/", req.nextUrl.origin);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as DecodedToken;
      console.log(`ミドルウェア: ページルート (${currentPath}): JWT検証成功。デコードされたユーザーID:`, decoded.id);
      
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("user", JSON.stringify({ id: decoded.id, email: decoded.email, name: decoded.name }));
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error(`ミドルウェア: ページルート (${currentPath}) のJWT検証に失敗しました:`, (error as Error).message);
      const loginUrl = new URL("/", req.nextUrl.origin);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ログインページ(/)や認証APIはそのまま通過
  console.log("ミドルウェア: 非保護ルートまたは認証済みルートを通過:", currentPath);
  return NextResponse.next();
}

// ミドルウェアの適用パス設定
export const config = {
  matcher: [
    // /api/로 시작하는 모든 경로 (API 인증용)
    "/api/:path*", 
    // /blog 로 시작하는 모든 경로 (페이지 인증용)
    "/blog/:path*", 
    // 루트 경로 (새로운 로그인 페이지)
    // 미들웨어는 이 경로에도 적용되지만, 내부 로직에서 isLoginPage 일 경우 통과시킴
    "/",
  ],
};