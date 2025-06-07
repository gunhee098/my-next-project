import { NextRequest, NextResponse } from "next/server"; // Next.jsのAPIルートのためのモジュール
import pool from "@/lib/db"; // データベース接続プールをインポート
import { authenticateUser } from "@/lib/auth"; // ユーザーログイン検証関数をインポート (必須)

// ⚡ [PUT] 投稿の更新
// 特定のIDを持つ投稿を更新します。認証されたユーザーが自身の投稿のみを更新できます。
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const id = context.params.id; // URLパラメータから投稿ID文字列を取得
  const postId = parseInt(id, 10); // 投稿IDを数値に変換

  // 投稿IDが有効な数値でない場合
  if (isNaN(postId)) {
    return NextResponse.json({ error: "無効な投稿IDです。" }, { status: 400 });
  }

  try {
    // ユーザー認証を実行し、ログインしているユーザーのIDを取得
    const userId = authenticateUser(req);

    // 投稿情報を先にデータベースから 조회 (取得)
    const postResult = await pool.query("SELECT userid FROM posts WHERE id = $1", [postId]); // 投稿IDのみで十分
    // 投稿が見つからない場合
    if (postResult.rowCount === 0) {
      return NextResponse.json({ error: "投稿が見つかりませんでした。" }, { status: 404 });
    }

    const post = postResult.rows[0];
    // 投稿の所有者とログインユーザーが異なる場合
    if (post.userid !== userId) {
      return NextResponse.json({ error: "ご自身の投稿のみ更新できます。" }, { status: 403 });
    }

    // リクエストボディから更新するタイトルと内容を取得
    const { title, content } = await req.json();
    // タイトルまたは内容が不足している場合
    if (!title || !content) {
      return NextResponse.json({ error: "タイトルと内容は必須です。" }, { status: 400 });
    }

    // データベースで投稿を更新
    const updateResult = await pool.query(
      "UPDATE posts SET title = $1, content = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
      [title, content, postId]
    );

    // 更新された投稿データを返却
    return NextResponse.json(updateResult.rows[0]);
  } catch (error) {
    // データベースエラーやその他の予期せぬエラーが発生した場合
    console.error("投稿の更新中にエラーが発生しました:", error); // コンソールエラーメッセージを日本語に
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}

// ⚡ [GET] 投稿の取得
// 特定のIDを持つ単一の投稿を取得します。
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const id = context.params?.id; // URLパラメータから投稿ID文字列を安全に取得

  console.log("リクエスト受信 - GET ID:", id); // コンソールログを日本語に

  // 投稿IDが提供されていない場合
  if (!id) {
    return NextResponse.json({ error: "投稿IDがありません。" }, { status: 400 });
  }

  try {
    // データベースから指定されたIDの投稿を取得
    const result = await pool.query("SELECT * FROM posts WHERE id = $1", [parseInt(id, 10)]);

    // 投稿が見つからない場合
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "投稿が見つかりませんでした。" }, { status: 404 });
    }

    console.log("投稿の読み込みに成功しました:", result.rows[0]); // コンソールログを日本語に
    // 取得した投稿データを返却
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    // データベースエラーが発生した場合
    console.error("データベースエラー:", error); // コンソールエラーメッセージを日本語に
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}

// ⚡ [DELETE] 投稿の削除
// 特定のIDを持つ投稿を削除します。認証されたユーザーが自身の投稿のみを削除できます。
export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const id = parseInt(context.params.id, 10); // URLパラメータから投稿IDを数値に変換

  console.log("リクエスト受信 - DELETE ID:", id); // コンソールログを日本語に

  // 投稿IDが有効な数値でない場合
  if (isNaN(id)) {
    return NextResponse.json({ error: "無効な投稿IDです。" }, { status: 400 });
  }

  try {
    // ユーザー認証を実行。ここでエラーが発生した場合、認証失敗として処理されます。
    const userId = authenticateUser(req);
    console.log("ログインユーザーID:", userId); // コンソールログを日本語に

    // 削除対象の投稿情報をデータベースから取得
    const postResult = await pool.query("SELECT userid FROM posts WHERE id = $1", [id]);

    // 投稿が見つからない場合
    if (postResult.rowCount === 0) {
      return NextResponse.json({ error: "投稿が見つかりませんでした。" }, { status: 404 });
    }

    const post = postResult.rows[0];
    console.log("投稿情報:", post); // コンソールログを日本語に

    // 投稿の所有者とログインユーザーが異なる場合
    if (post.userid !== userId) {
      console.warn("注意: 他のユーザーの投稿を削除しようとしました。"); // コンソール警告を日本語に
      return NextResponse.json({ error: "ご自身の投稿のみ削除できます。" }, { status: 403 });
    }

    // データベースから投稿を削除し、削除された行を返却
    const deleteResult = await pool.query("DELETE FROM posts WHERE id = $1 RETURNING *", [id]);

    console.log("削除が完了しました:", deleteResult.rows[0]); // コンソールログを日本語に
    // 成功メッセージと削除された投稿データを返却
    return NextResponse.json({ message: "正常に削除されました。", post: deleteResult.rows[0] });

  } catch (error) {
    // エラーが発生した場合
    console.error("DELETE中にエラーが発生しました:", error); // コンソールエラーメッセージを日本語に
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}