import { NextRequest, NextResponse } from "next/server"; // Next.jsのAPIルートのためのモジュール
import pool from "@/lib/db"; // データベース接続プールをインポート
import { authenticateUser } from "@/lib/auth"; // ユーザー認証ヘルパー関数をインポート

// ⚡ [GET] 投稿リストの取得
// クエリパラメータ 'search' と 'orderBy' に基づいて投稿を検索し、一覧を返します。
export async function GET(req: NextRequest) {
  try {
    const client = await pool.connect(); // データベースクライアントを接続プールから取得
    const { searchParams } = new URL(req.url); // リクエストURLから検索パラメータを取得
    const keyword = searchParams.get("search"); // 'search' パラメータの値を取得
    const orderBy = searchParams.get("orderBy"); // 💡 追加: 'orderBy' パラメータの値を取得

    let query = `
      SELECT 
        posts.*, 
        "User".name AS username,
        posts.image_url AS image_url -- 💡 追加: image_url を明示的に選択
      FROM posts
      JOIN "User" ON posts.userid = "User".id
    `;
    const params = [];
    let whereClause = "";

    // 検索キーワードがある場合、タイトルまたは内容で部分一致検索を実行
    if (keyword) {
      whereClause = `WHERE posts.title ILIKE $1 OR posts.content ILIKE $1`;
      params.push(`%${keyword}%`);
    }

    // 💡 修正: ソート順を動的に設定
    let orderClause = `ORDER BY posts.created_at DESC`; // デフォルトは最新順
    if (orderBy === "oldest") {
      orderClause = `ORDER BY posts.created_at ASC`; // 'oldest' の場合は古い順
    }

    // クエリを組み立て
    query += ` ${whereClause} ${orderClause}`;

    const result = await client.query(query, params);

    client.release(); // データベースクライアントをプールに返却
    return NextResponse.json(result.rows); // 取得した投稿データをJSON形式で返却
  } catch (error) {
    console.error("投稿の読み込みに失敗しました:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました！" }, { status: 500 });
  }
}

// ⚡ [POST] 新しい投稿の作成
// 認証されたユーザーとして新しいブログ投稿を作成します。
export async function POST(req: NextRequest) {
  try {
    // ユーザー認証を実行。認証に失敗した場合はエラーがスローされます。
    const userId = authenticateUser(req);
    console.log("✔ ユーザーID:", userId);

    // リクエストボディからタイトル、内容、💡 image_url を取得
    const { title, content, image_url } = await req.json(); // 💡 追加: image_url

    // タイトルまたは内容が提供されていない場合
    if (!title || !content) {
      return NextResponse.json({ error: "タイトルと内容を入力してください！" }, { status: 400 });
    }

    const client = await pool.connect(); // データベースクライアントを接続プールから取得
    // 新しい投稿をデータベースに挿入 (💡 image_url フィールドも追加)
    await client.query(
      "INSERT INTO posts (userid, title, content, image_url, created_at) VALUES ($1, $2, $3, $4, NOW())", // 💡 SQL クエリ修正
      [userId, title, content, image_url] // 💡 パラメータ修正
    );
    client.release(); // データベースクライアントをプールに返却

    return NextResponse.json({ success: true }, { status: 201 }); // 成功レスポンスを返却 (Created)
  } catch (error) {
    console.error("投稿の作成に失敗しました:", error);
    // 認証エラーはauthenticateUserで処理されるため、ここでは一般的なサーバーエラーとして返却
    return NextResponse.json({ error: "サーバーエラーが発生しました！" }, { status: 500 });
  }
}

// ⚡ [PUT] 既存の投稿の更新
// 認証されたユーザーとして既存のブログ投稿を更新します。
export async function PUT(req: NextRequest) {
  try {
    // ユーザー認証を実行
    const userId = authenticateUser(req);
    console.log("✔ ユーザーID:", userId);

    // リクエストボディから投稿ID、タイトル、内容、💡 image_url を取得
    const { id, title, content, image_url } = await req.json(); // 💡 追加: image_url

    // 必要なデータが不足している場合
    if (!id || !title || !content) {
      // 💡 image_url はオプションなので、ここではチェックしない
      return NextResponse.json({ error: "データが不足しています！" }, { status: 400 });
    }

    const client = await pool.connect(); // データベースクライアントを接続プールから取得
    // 更新対象の投稿のユーザーIDを取得し、現在のユーザーIDと一致するか確認
    const post = await client.query("SELECT userid FROM posts WHERE id = $1", [id]);

    // 投稿が見つからない場合
    if (post.rows.length === 0) {
      return NextResponse.json({ error: "投稿が見つかりませんでした！" }, { status: 404 });
    }

    // 投稿のユーザーIDが認証されたユーザーのIDと一致しない場合
    if (post.rows[0].userid !== userId) {
      return NextResponse.json({ error: "ご自身の投稿のみ編集できます！" }, { status: 403 });
    }

    // 投稿をデータベースで更新 (💡 image_url フィールドも追加)
    await client.query(
      "UPDATE posts SET title = $1, content = $2, image_url = $3, updated_at = NOW() WHERE id = $4", // 💡 SQL クエリ修正
      [title, content, image_url, id] // 💡 パラメータ修正
    );

    client.release(); // データベースクライアントをプールに返却
    return NextResponse.json({ success: true }); // 成功レスポンスを返却
  } catch (error) {
    console.error("投稿の更新に失敗しました:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました！" }, { status: 500 });
  }
}

// ⚡ [DELETE] 投稿の削除
// 認証されたユーザーとして既存のブログ投稿を削除します。
export async function DELETE(req: NextRequest) {
  try {
    // ユーザー認証を実行
    const userId = authenticateUser(req);
    console.log("✔ ユーザーID:", userId);

    // リクエストボディから削除する投稿のIDを取得
    // 💡 DELETEは通常URLパラメータからIDを取得することが多いですが、ここではreq.json()から取得する既存ロジックを維持します。
    // 💡 ただし、Next.jsのAPIルートではDELETEメソッドのreq.json()は空の場合があるため、URLからID를 얻는 것이 더 안정적입니다.
    // 💡 예를 들어, const postId = req.nextUrl.pathname.split('/').pop(); 로 변경을 고려할 수 있습니다.
    const { id } = await req.json(); // 현재 로직을 유지

    // IDが提供されていない場合
    if (!id) {
      return NextResponse.json({ error: "削除する投稿のIDが必要です！" }, { status: 400 });
    }

    const client = await pool.connect(); // データベースクライアントを接続プールから取得
    // 削除対象の投稿のユーザーIDを取得し、現在のユーザーIDと一致するか確認
    const post = await client.query("SELECT userid FROM posts WHERE id = $1", [id]);

    // 投稿が見つからない場合
    if (post.rows.length === 0) {
      return NextResponse.json({ error: "投稿が見つかりませんでした！" }, { status: 404 });
    }

    // 投稿のユーザーIDが認証されたユーザーのIDと一致しない場合
    if (post.rows[0].userid !== userId) {
      return NextResponse.json({ error: "ご自身の投稿のみ削除できます！" }, { status: 403 });
    }

    // データベースから投稿を削除
    await client.query("DELETE FROM posts WHERE id = $1", [id]);

    client.release(); // データベースクライアントをプールに返却
    return NextResponse.json({ success: true }); // 成功レスポンスを返却
  } catch (error) {
    console.error("投稿の削除に失敗しました:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました！" }, { status: 500 });
  }
}