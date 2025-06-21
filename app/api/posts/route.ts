// 📂 app/api/posts/route.ts

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db"; // データベース接続プールをインポート
import { authenticateUser } from "@/lib/auth"; // ユーザー認証関数をインポート
import jwt from "jsonwebtoken"; // JWT検証のためにインポート (authenticateUserでJWTを直接検証する場合に必要)

// ⚡ [GET] 全投稿の取得
// クエリパラメータに基づいて投稿をフィルタリングおよびソートして取得します。
export async function GET(req: NextRequest) {
  try {
    const client = await pool.connect(); // データベースクライアントを接続プールから取得
    const { searchParams } = new URL(req.url); // リクエストURLから検索パラメータを取得

    let keyword = searchParams.get("search"); // 'search' パラメータの値を取得

    // URLエンコードされた検索キーワードをデコード
    if (keyword) {
      keyword = decodeURIComponent(keyword);
    }

    // デバッグ用コンソールログ (確認のため一時的に維持)
    console.log("--- APIリクエストデバッグ ---");
    console.log("受信した生のsearchParams:", searchParams.toString());
    console.log("searchParamsから抽出されたキーワード (デコード前):", searchParams.get("search"));
    console.log("デコードされたキーワード:", keyword);
    // ---

    const orderBy = searchParams.get("orderBy"); // 'orderBy' パラメータの値を取得

    let query = `
      SELECT
        posts.*,
        "User".name AS username,
        posts.image_url AS image_url
      FROM posts
      JOIN "User" ON posts.userid = "User".id
    `;
    const params = []; // SQLクエリのパラメータを格納する配列
    let whereClause = ""; // WHERE句を格納する変数

    if (keyword) {
      // キーワードが存在する場合、タイトルまたは内容で部分一致検索
      whereClause = `WHERE posts.title ILIKE $1 OR posts.content ILIKE $1`;
      params.push(`%${keyword}%`);
    }

    let orderClause = `ORDER BY posts.created_at DESC`; // デフォルトは新しい順
    if (orderBy === "oldest") {
      orderClause = `ORDER BY posts.created_at ASC`; // 古い順
    }

    query += ` ${whereClause} ${orderClause}`; // クエリ文字列を構築

    console.log("実行する最終SQLクエリ:", query);
    console.log("SQLクエリのパラメータ:", params);

    const result = await client.query(query, params); // SQLクエリを実行

    console.log("SQLクエリ結果の行数:", result.rows.length);
    console.log("SQLクエリ結果の行 (最初の2件):", result.rows.slice(0, 2));

    client.release(); // データベースクライアントをプールに返却
    return NextResponse.json(result.rows); // 結果をJSON形式で返却
  } catch (error) {
    console.error("GET /api/posts でエラーが発生しました:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました！" }, { status: 500 });
  }
} 

// ⚡ [PUT] 既存の投稿の更新
// 認証されたユーザーとして既存のブログ投稿を更新します。
export async function PUT(req: NextRequest) {
  try {
    // ユーザー認証を実行し、ユーザーIDを取得
    const userId = authenticateUser(req);
    console.log("✔ ユーザーID:", userId);

    // リクエストボディから投稿ID、タイトル、内容、画像URLを取得
    const { id, title, content, image_url } = await req.json();

    // 必要なデータが不足している場合 (画像URLはオプション)
    if (!id || !title || !content) {
      return NextResponse.json({ error: "データが不足しています！" }, { status: 400 });
    }

    const client = await pool.connect(); // データベースクライアントを接続プールから取得
    // 更新対象の投稿のユーザーIDを取得し、現在のユーザーIDと一致するか確認
    const post = await client.query("SELECT userid FROM posts WHERE id = $1", [id]);

    // 投稿が見つからない場合
    if (post.rows.length === 0) {
      return NextResponse.json({ error: "投稿が見つかりませんでした！" }, { status: 404 });
    }

    // 投稿のユーザーIDが認証されたユーザーのIDと一致しない場合 (他人の投稿は編集不可)
    if (post.rows[0].userid !== userId) {
      return NextResponse.json({ error: "ご自身の投稿のみ編集できます！" }, { status: 403 });
    }

    // 投稿をデータベースで更新 (タイトル、内容、画像URL、更新日時)
    await client.query(
      "UPDATE posts SET title = $1, content = $2, image_url = $3, updated_at = NOW() WHERE id = $4",
      [title, content, image_url, id]
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
    // ユーザー認証を実行し、ユーザーIDを取得
    const userId = authenticateUser(req);
    console.log("✔ ユーザーID:", userId);

    // リクエストボディから削除する投稿のIDを取得
    // (補足: DELETEは通常URLパラメータからIDを取得することが多いですが、ここではreq.json()から取得する既存ロジックを維持します。)
    const { id } = await req.json();

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

    // 投稿のユーザーIDが認証されたユーザーのIDと一致しない場合 (他人の投稿は削除不可)
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

// ⚡ [POST] 新しい投稿の作成
// 認証されたユーザーとして新しいブログ投稿を作成します。
export async function POST(req: NextRequest) {
  const client = await pool.connect(); // データベースクライアントを接続プールから取得
  try {
    // 1. ユーザー認証: authenticateUser 関数を再利用し、ユーザーIDを取得
    const userId = authenticateUser(req);
    console.log("✔ ユーザーID:", userId);

    // 2. リクエストボディをJSONとしてパース (フロントエンドと一致させるため)
    // フロントエンドからJSON.stringifyで送られてくるため、req.json()でパースします。
    const { title, content, image_url } = await req.json();

    // 必須フィールド (タイトルと内容) のチェック
    if (!title || !content) {
      console.error("Post API: タイトルまたは内容が不足しています。");
      return NextResponse.json({ error: "タイトルと内容は必須です！" }, { status: 400 });
    }

    // image_url はオプションなので、存在しない場合はnullを設定
    let imageUrlToSave: string | null = image_url || null;

    // 3. データベーストランザクションを開始
    await client.query('BEGIN');

    // 4. 新しい投稿をデータベースに挿入し、挿入された行を返却
    const result = await client.query(
      `INSERT INTO posts (title, content, userid, image_url) VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, content, userId, imageUrlToSave]
    );
    const newPost = result.rows[0]; // 挿入された投稿データ

    await client.query('COMMIT'); // トランザクションをコミット

    // 5. 成功レスポンスを返却
    console.log("Post API: 投稿が正常に作成されました。");
    return NextResponse.json(
      {
        message: "投稿が正常に作成されました！", // 日本語メッセージ
        post: newPost, // 生成された投稿情報を含める
      },
      { status: 201 } // 201 Created ステータスコードを使用
    );

  } catch (error) {
    await client.query('ROLLBACK'); // エラー発生時、トランザクションをロールバック
    console.error("Post API: 投稿の作成中にエラーが発生しました:", error); // エラーの詳細をログに出力

    // 6. エラーレスポンスを返却
    // クライアントがパースできるJSON形式でエラーメッセージを返します。
    return NextResponse.json(
      { error: (error as Error).message || "投稿の作成中にサーバーエラーが発生しました。" }, // 実際のエラーメッセージを返すか、デフォルトメッセージ
      { status: 500 } // 500 Internal Server Error ステータスコードを使用
    );
  } finally {
    client.release(); // データベースクライアントをプールに返却
  }
}