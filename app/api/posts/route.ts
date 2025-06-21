import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { authenticateUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const client = await pool.connect();
    const { searchParams } = new URL(req.url);

    let keyword = searchParams.get("search"); // 'search' 파라미터의 값

    // === 여기서 수정 ===
    if (keyword) {
      keyword = decodeURIComponent(keyword); // URL 인코딩된 검색어 디코딩
    }
    // ==================

    // (디버깅을 위한 console.log는 잠시 유지)
    console.log("--- API Request Debugging ---");
    console.log("Received raw searchParams:", searchParams.toString());
    console.log("Extracted keyword from searchParams (before decode):", searchParams.get("search"));
    console.log("Decoded keyword:", keyword); // 디코딩된 키워드 확인
    // ---

    const orderBy = searchParams.get("orderBy");

    let query = `
      SELECT
        posts.*,
        "User".name AS username,
        posts.image_url AS image_url
      FROM posts
      JOIN "User" ON posts.userid = "User".id
    `;
    const params = [];
    let whereClause = "";

    if (keyword) {
      // 디코딩된 키워드를 사용
      whereClause = `WHERE posts.title ILIKE $1 OR posts.content ILIKE $1`;
      params.push(`%${keyword}%`);
    }

    let orderClause = `ORDER BY posts.created_at DESC`;
    if (orderBy === "oldest") {
      orderClause = `ORDER BY posts.created_at ASC`;
    }

    query += ` ${whereClause} ${orderClause}`;

    console.log("Final SQL Query to execute:", query);
    console.log("Parameters for SQL query:", params);

    const result = await client.query(query, params);

    console.log("SQL Query Result Rows count:", result.rows.length);
    console.log("SQL Query Result Rows (first 2 items):", result.rows.slice(0, 2));

    client.release();
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error in GET /api/posts:", error);
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