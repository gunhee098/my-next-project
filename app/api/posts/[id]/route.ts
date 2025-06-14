// 📂 app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"; // Next.jsのAPIルートのためのモジュール
import pool from "@/lib/db"; // データベース接続プールをインポート
import { authenticateUser } from "@/lib/auth"; // ユーザー認証関数をインポート

/**
 * ⚡ [PUT] 投稿の更新
 * 特定のIDを持つ投稿を更新します。認証されたユーザーが自身の投稿のみを更新できます。
 * @param req NextRequest オブジェクト
 * @param context URLパラメータを含むコンテキストオブジェクト
 * @returns NextResponse オブジェクト (成功時は更新された投稿データ, 失敗時はエラーメッセージ)
 */
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  // 💡 수정: 불필요한 'id' 변수 선언을 제거하고, 'postId'만 사용합니다.
  const postId = parseInt(context.params.id, 10); // URLパラメータから投稿IDを数値に変換

  // 投稿IDのバリデーション
  if (isNaN(postId)) {
    return NextResponse.json({ error: "無効な投稿IDです。" }, { status: 400 });
  }

  try {
    // ユーザー認証
    const userId = authenticateUser(req); // 認証失敗時はここでエラーがスローされます

    // 投稿の存在確認と所有者チェック
    const postResult = await pool.query("SELECT userid FROM posts WHERE id = $1", [postId]);
    if (postResult.rowCount === 0) {
      return NextResponse.json({ error: "投稿が見つかりませんでした。" }, { status: 404 });
    }

    const post = postResult.rows[0];
    if (post.userid !== userId) {
      return NextResponse.json({ error: "ご自身の投稿のみ更新できます。" }, { status: 403 });
    }

    // リクエストボディからタイトル、内容、画像URLを取得
    const { title, content, image_url } = await req.json();

    // タイトルと内容は必須項目のバリデーション (image_urlはオプション)
    if (!title || !content) {
      return NextResponse.json({ error: "タイトルと内容は必須です。" }, { status: 400 });
    }

    // 投稿データをデータベースで更新
    // image_urlがnullで送信された場合、DBのimage_urlもnullになります。
    const updateResult = await pool.query(
      "UPDATE posts SET title = $1, content = $2, image_url = $3, updated_at = NOW() WHERE id = $4 RETURNING *",
      [title, content, image_url, postId]
    );

    return NextResponse.json(updateResult.rows[0]);
  } catch (error) {
    // エラーハンドリング
    console.error("投稿の更新中にエラーが発生しました:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}

/**
 * ⚡ [GET] 投稿の取得
 * 特定のIDを持つ単一の投稿を取得します。
 * @param req NextRequest オブジェクト
 * @param context URLパラメータを含むコンテキストオブジェクト
 * @returns NextResponse オブジェクト (成功時は投稿データ, 失敗時はエラーメッセージ)
 */
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  // 💡 수정: 'id' 변수를 직접 파싱하여 사용합니다.
  const postId = parseInt(context.params.id, 10); // URLパラメータから投稿IDを数値に変換

  console.log("リクエスト受信 - GET ID:", postId); // リクエスト受信ログ

  // 投稿IDのバリデーション
  if (isNaN(postId)) { // `id` 대신 `postId`를 사용
    return NextResponse.json({ error: "無効な投稿IDです。" }, { status: 400 });
  }

  try {
    // データベースから投稿情報を取得 (ユーザー名を結合)
    const result = await pool.query(
      `SELECT
         posts.id,
         posts.userid,
         posts.title,
         posts.content,
         posts.created_at,
         posts.updated_at,
         posts.image_url,
         "User".name AS username -- ユーザー名を 'username'として取得
       FROM posts
       JOIN "User" ON posts.userid = "User".id
       WHERE posts.id = $1`,
      [postId] // 💡 수정: postId를 쿼리에 사용
    );

    // 投稿が見つからない場合
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "投稿が見つかりませんでした。" }, { status: 404 });
    }

    console.log("投稿の読み込みに成功しました:", result.rows[0]); // 成功ログ
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    // エラーハンドリング
    console.error("データベースエラー:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}

/**
 * ⚡ [DELETE] 投稿の削除
 * 特定のIDを持つ投稿を削除します。認証されたユーザーが自身の投稿のみを削除できます。
 * @param req NextRequest オブジェクト
 * @param context URLパラメータを含むコンテキストオブジェクト
 * @returns NextResponse オブジェクト (成功時は削除メッセージ, 失敗時はエラーメッセージ)
 */
export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  // 💡 수정: 'id' 변수 대신 'postId'로 바로 파싱하여 사용합니다.
  const postId = parseInt(context.params.id, 10); // URLパラメータから投稿IDを数値に変換

  console.log("リクエスト受信 - DELETE ID:", postId); // リクエスト受信ログ

  // 投稿IDのバリデーション
  if (isNaN(postId)) { // `id` 대신 `postId`를 사용
    return NextResponse.json({ error: "無効な投稿IDです。" }, { status: 400 });
  }

  try {
    // ユーザー認証
    const userId = authenticateUser(req);
    console.log("ログインユーザーID:", userId); // ログインユーザーIDログ

    // 投稿の存在確認と所有者チェック
    const postResult = await pool.query("SELECT userid FROM posts WHERE id = $1", [postId]); // 💡 수정: postId 사용

    if (postResult.rowCount === 0) {
      return NextResponse.json({ error: "投稿が見つかりませんでした。" }, { status: 404 });
    }

    const post = postResult.rows[0];
    console.log("投稿情報:", post); // 投稿情報ログ

    if (post.userid !== userId) {
      console.warn("注意: 他のユーザーの投稿を削除しようとしました。"); // 警告ログ
      return NextResponse.json({ error: "ご自身の投稿のみ削除できます。" }, { status: 403 });
    }

    // データベースから投稿を削除
    const deleteResult = await pool.query("DELETE FROM posts WHERE id = $1 RETURNING *", [postId]); // 💡 수정: postId 사용

    console.log("削除が完了しました:", deleteResult.rows[0]); // 削除完了ログ
    return NextResponse.json({ message: "正常に削除されました。", post: deleteResult.rows[0] });

  } catch (error) {
    // エラーハンドリング
    console.error("DELETE中にエラーが発生しました:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}