// 📂 app/api/blog/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { authenticateUser } from "@/lib/auth";

// DELETEリクエストハンドラー
// 特定のIDを持つ投稿を削除します。認証されたユーザーが自身の投稿のみを削除できます。
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // ログインしているユーザーのIDを取得します。
    // authenticateUser関数は、認証に失敗した場合にエラーをスローします。
    const userId = authenticateUser(req);

    // 投稿の存在を確認し、その投稿がログインユーザーに属しているかを検証します。
    // "Post"テーブルから指定されたIDの投稿を取得します。
    const postResult = await pool.query('SELECT * FROM "Post" WHERE id = $1', [params.id]);
    const post = postResult.rows[0];

    // 投稿が見つからない場合
    if (!post) {
      return NextResponse.json({ error: "投稿が存在しません！" }, { status: 404 });
    }

    // 👇 投稿の作成者とログインユーザーが一致するかを確認します。
    // `post.user_id` はデータベースの実際のカラム名に合わせてください。
    // もしカラム名が `userid` なら `post.userid` を使用してください。
    if (post.user_id !== userId) { // もしDBのカラム名が `userid` なら `post.userid !== userId`
      return NextResponse.json({ error: "削除権限がありません！" }, { status: 403 });
    }

    // 投稿をデータベースから削除します。
    await pool.query('DELETE FROM "Post" WHERE id = $1', [params.id]);
    // 削除成功の応答を返します。
    return NextResponse.json({ message: "削除成功！" }, { status: 200 });

  } catch (error) {
    // エラーが発生した場合（例: トークン検証失敗、データベースエラー）
    console.error("🚨 DELETE処理中にエラーが発生しました:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました！" }, { status: 500 });
  }
}