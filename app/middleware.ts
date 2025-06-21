// 📂 middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

// ミドルウェア関数
export function middleware(req: NextRequest) {
  // 認証トークンをAuthorizationヘッダーから取得します。
  // localStorageに保存されているトークンは、クライアントがAPIリクエストのAuthorizationヘッダーに手動で追加します。
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  // 保護するページルートとAPIルートを定義します。
  // "/blog"以下の全てのパス（例: /blog, /blog/new, /blog/[id]/edit）を保護対象とします。
  const protectedPagePaths = ["/blog", "/blog/new"];
  // 動的ルート（例: /blog/[id]/edit）も考慮します。
  const isEditPage = req.nextUrl.pathname.match(/^\/blog\/\d+\/edit$/); // "/blog/数字/edit" の形式にマッチ

  // 保護するAPIルートを定義します。
  const protectedApiPaths = ["/api/posts", "/api/user", "/api/likes"]; // 💡 /api/likes を追加

  // 現在のリクエストパスが保護されたページルートに該当するかをチェック
  const isProtectedPage = protectedPagePaths.some(path => req.nextUrl.pathname.startsWith(path)) || isEditPage;
  // 現在のリクエストパスが保護されたAPIルートに該当するかをチェック
  const isProtectedApi = protectedApiPaths.some(path => req.nextUrl.pathname.startsWith(path));

  // 1. ページルート保護ロジック
  if (isProtectedPage) {
    // --- デバッグ用コンソールログ開始 ---
    console.log("--- ミドルウェアデバッグ: 保護されたページルート ---");
    console.log("ミドルウェア: アクセス中の保護されたページルート:", req.nextUrl.pathname);
    console.log("ミドルウェア: 完全なURL:", req.nextUrl.href);
    console.log("ミドルウェア: 受信したAuthorizationヘッダー:", authHeader);
    console.log("ミドルウェア: 抽出されたトークン:", token ? token.substring(0, 10) + '...' : "トークンなし"); // トークン全体ではなく一部のみ出力
    // --- デバッグ用コンソールログ終了 ---

    if (!token) {
      // トークンがない場合、ログインページにリダイレクトします。
      console.warn("ミドルウェア: トークンがありません。ログインページにリダイレクトします。");
      const loginUrl = new URL("/", req.nextUrl.origin); // ルートパス（ログインページ）のURLを作成
      return NextResponse.redirect(loginUrl); // リダイレクト応答を返します
    }

    try {
      // トークンを検証します。
      // process.env.JWT_SECRETが設定されていない場合のフォールバック値も忘れずに含めます。
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
      // 💡 userIdではなくidを使用する場合、decoded.idに変更が必要かもしれません。
      //    お客様のDecodedTokenインターフェースでidを使用しているので、decoded.idがより正確です。
      console.log("ミドルウェア: JWT検証成功。デコードされたユーザーID:", (decoded as any).id); // お客様のDecodedTokenに合わせてuserIdをidに修正
      return NextResponse.next(); // トークンが有効であれば、次の処理へ進みます（ページ表示）
    } catch (error) {
      console.error("ミドルウェア: ページルートのJWT検証に失敗しました:", (error as Error).message); // エラーメッセージのみ出力
      // トークンが無効または期限切れの場合、ログインページにリダイレクトします。
      const loginUrl = new URL("/", req.nextUrl.origin);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. APIルート保護ロジック (既存のロジックを維持しつつ、認証ヘッダーのみで判断)
  if (isProtectedApi) {
    // --- デバッグ用コンソールログ開始 ---
    console.log("--- ミドルウェアデバッグ: 保護されたAPIルート ---");
    console.log("ミドルウェア: アクセス中の保護されたAPIルート:", req.nextUrl.pathname);
    console.log("ミドルウェア: 受信したAuthorizationヘッダー:", authHeader);
    console.log("ミドルウェア: 抽出されたトークン:", token ? token.substring(0, 10) + '...' : "トークンなし"); // トークン全体ではなく一部のみ出力
    // --- デバッグ用コンソールログ終了 ---

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // Authorizationヘッダーがない、または"Bearer "で始まらない場合
      console.warn("ミドルウェア: APIルート: Authorizationヘッダーがありません。");
      return NextResponse.json({ error: "認証が必要です！" }, { status: 401 }); // 認証エラーを返す
    }
    const apiToken = authHeader.split(" ")[1]; // トークン部分を抽出
    try {
      // JWTトークンを検証
      const decoded = jwt.verify(apiToken, process.env.JWT_SECRET || "default_secret");
      // 💡 userIdではなくidを使用する場合、decoded.idに変更が必要かもしれません。
      //    お客様のDecodedTokenインターフェースでidを使用しているので、decoded.idがより正確です。
      console.log("ミドルウェア: APIルート: JWT検証成功。デコードされたユーザーID:", (decoded as any).id); // お客様のDecodedTokenに合わせてuserIdをidに修正
      // 検証済みユーザー情報をリクエストヘッダーに保存し、次のAPI処理へ進む
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("user", JSON.stringify(decoded)); // 'user'ヘッダーにデコードされた情報を設定
      return NextResponse.next({
        request: {
          headers: requestHeaders, // 新しいヘッダーを持つリクエストで続行
        },
      });
    } catch (error) {
      console.error("ミドルウェア: APIルートのJWT検証に失敗しました:", (error as Error).message); // エラーメッセージのみ出力
      return NextResponse.json({ error: "無効なトークンです！" }, { status: 403 }); // 無効なトークンエラーを返す
    }
  }

  // 保護されていないルート（例: ログインページ、ホームディレクトリ /）はそのまま通過させます。
  console.log("ミドルウェア: 非保護ルートを通過:", req.nextUrl.pathname);
  return NextResponse.next();
}

// ミドルウェアの適用パス設定
export const config = {
  // 以下のパスにのみミドルウェアが適用されます。
  matcher: [
    "/api/posts/:path*", // /api/posts/で始まる全てのAPIルート
    "/api/user",         // /api/user APIルート
    "/api/likes",        // 💡 /api/likes APIルートを追加
    "/blog/:path*",      // /blog およびその配下の全てのページルート（例: /blog, /blog/new, /blog/123, /blog/123/edit）
    "/",                 // ルートパス（/）もミドルウェアの対象に含める (ログインページがここにある場合、適切に処理されるように)
  ],
};