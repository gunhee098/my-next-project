import { NextRequest, NextResponse } from "next/server"; // Next.jsのAPIルートのためのモジュール
import pool from "@/lib/db"; // データベース接続プールをインポート
import { authenticateUser } from "@/lib/auth"; // ユーザーログイン検証関数をインポート (必須)

// ⚡ [PUT] 投稿の更新
// 特定のIDを持つ投稿を更新します。認証されたユーザーが自身の投稿のみを更新できます。
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const id = context.params.id; // URLパラメータから投稿ID文字列を取得
  const postId = parseInt(id, 10); // 投稿IDを数値に変換

  if (isNaN(postId)) {
    return NextResponse.json({ error: "無効な投稿IDです。" }, { status: 400 });
  } 

  try {
    const userId = authenticateUser(req);

    const postResult = await pool.query("SELECT userid FROM posts WHERE id = $1", [postId]);
    if (postResult.rowCount === 0) {
      return NextResponse.json({ error: "投稿が見つかりませんでした。" }, { status: 404 });
    }

    const post = postResult.rows[0];
    if (post.userid !== userId) { // 'userid' をそのまま使用
      return NextResponse.json({ error: "ご自身の投稿のみ更新できます。" }, { status: 403 });
    }

    // 💡 変更点: image_url もリクエストボディから取得
    const { title, content, image_url } = await req.json();

    if (!title || !content) { // image_url は必須ではないのでチェックしない
      return NextResponse.json({ error: "タイトルと内容は必須です。" }, { status: 400 });
    }

    // 💡 変更点: image_url カラムも更新対象に追加
    // image_url が null で送信された場合、DBのimage_urlもnullになります
    const updateResult = await pool.query(
      "UPDATE posts SET title = $1, content = $2, image_url = $3, updated_at = NOW() WHERE id = $4 RETURNING *",
      [title, content, image_url, postId]
    );

    return NextResponse.json(updateResult.rows[0]);
  } catch (error) {
    console.error("投稿の更新中にエラーが発生しました:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}

// ⚡ [GET] 投稿の取得
// 特定のIDを持つ単一の投稿を取得します。
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const id = context.params?.id;

  console.log("リクエスト受信 - GET ID:", id);

  if (!id) {
    return NextResponse.json({ error: "投稿IDがありません。" }, { status: 400 });
  }

  try {
    // 💡 変更点: SELECT 文に image_url カラムを追加
    const result = await pool.query("SELECT id, userid, title, content, created_at, updated_at, image_url FROM posts WHERE id = $1", [parseInt(id, 10)]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "投稿が見つかりませんでした。" }, { status: 404 });
    }

    console.log("投稿の読み込みに成功しました:", result.rows[0]);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("データベースエラー:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}

// ⚡ [DELETE] 投稿の削除
// 特定のIDを持つ投稿を削除します。認証されたユーザーが自身の投稿のみを削除できます。
export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const id = parseInt(context.params.id, 10);

  console.log("リクエスト受信 - DELETE ID:", id);

  if (isNaN(id)) {
    return NextResponse.json({ error: "無効な投稿IDです。" }, { status: 400 });
  }

  try {
    const userId = authenticateUser(req);
    console.log("ログインユーザーID:", userId);

    const postResult = await pool.query("SELECT userid FROM posts WHERE id = $1", [id]);

    if (postResult.rowCount === 0) {
      return NextResponse.json({ error: "投稿が見つかりませんでした。" }, { status: 404 });
    }

    const post = postResult.rows[0];
    console.log("投稿情報:", post);

    if (post.userid !== userId) { // 'userid' をそのまま使用
      console.warn("注意: 他のユーザーの投稿を削除しようとしました。");
      return NextResponse.json({ error: "ご自身の投稿のみ削除できます。" }, { status: 403 });
    }

    const deleteResult = await pool.query("DELETE FROM posts WHERE id = $1 RETURNING *", [id]);

    console.log("削除が完了しました:", deleteResult.rows[0]);
    return NextResponse.json({ message: "正常に削除されました。", post: deleteResult.rows[0] });

  } catch (error) {
    console.error("DELETE中にエラーが発生しました:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}