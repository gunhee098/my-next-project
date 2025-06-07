import dotenv from "dotenv";
dotenv.config(); // .envファイルから環境変数をロード

import { Pool } from "pg"; // PostgreSQLの接続プールをインポート

// 環境変数 DATABASE_URL が設定されているか確認
// 設定されていない場合はエラーをスローし、アプリケーションの起動を停止
if (!process.env.DATABASE_URL) {
  throw new Error("🚨 DATABASE_URLが設定されていません！.envファイルを確認してください。");
}

// PostgreSQLデータベース接続プールを初期化
// DATABASE_URLは接続文字列（例: postgres://user:password@host:port/database）
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// データベース接続テストを即時実行関数 (IIFE) で実行
// アプリケーション起動時にDB接続の成否を確認します。
(async () => {
  try {
    const client = await pool.connect(); // 接続プールからクライアントを取得
    console.log("✅ PostgreSQL DBへの接続に成功しました！"); // 成功メッセージ
    client.release(); // クライアントを接続プールに戻す
  } catch (error) {
    console.error("🚨 PostgreSQL DBへの接続に失敗しました！", error); // 失敗メッセージ
  }
})();

// 'posts' テーブルを作成する非同期関数
// テーブルが既に存在する場合は何もしません (CREATE TABLE IF NOT EXISTS)。
export async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,              -- 投稿ID (自動採番、主キー)
        title TEXT NOT NULL,                -- 投稿タイトル (必須)
        content TEXT NOT NULL,              -- 投稿内容 (必須)
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 作成日時 (デフォルトは現在時刻)
        userId INT NOT NULL                 -- ユーザーID (必須)
      )
    `);
    console.log("✅ postsテーブルが正常に作成されました！"); // 成功メッセージ
  } catch (error) {
    console.error("🚨 postsテーブルの作成に失敗しました！", error); // 失敗メッセージ
  }
}

// データベース接続プールをデフォルトエクスポート
// 他のモジュールからこのプールを使用してデータベース操作を実行できるようにします。
export default pool;