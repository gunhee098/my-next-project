import { NextResponse } from "next/server"; // Next.jsのAPIルートのためのモジュール
import pool from "@/lib/db"; // データベース接続プールをインポート
import jwt from "jsonwebtoken"; // JWT (JSON Web Token) を扱うためのライブラリ
import bcrypt from "bcryptjs"; // パスワードのハッシュ化と検証のためのライブラリ

const SALT_ROUNDS = 10; // bcryptのソルト生成の強度（高いほど安全だが処理時間が増加）

// POSTリクエストハンドラー
// ユーザーの登録またはログイン処理を行います。
export async function POST(req: Request) {
  try {
    const body = await req.json(); // リクエストボディをJSONとしてパース
    console.log("📥 受信したリクエストデータ:", body); // リクエストデータのログを日本語に
    console.log("🔑 JWT_SECRET:", process.env.JWT_SECRET); // 環境変数JWT_SECRETのログを日本語に

    // リクエストボディから 'type', 'name', 'email', 'password' を抽出
    const { type, name, email, password } = body;

    // 'type' パラメータが不足している場合のエラーハンドリング
    if (!type) {
      return NextResponse.json({ error: "type の値 (login または register) が必要です。" }, { status: 400 }); // 💡 日本語に
    }

    // 'email' または 'password' が不足している場合のエラーハンドリング
    if (!email || !password) {
      return NextResponse.json({ error: "メールアドレスとパスワードを入力してください！" }, { status: 400 }); // 💡 日本語に
    }

    // ユーザー登録 (type === "register") 処理
    if (type === "register") {
      try {
        console.log("🔍 ユーザー登録を試行:", { name, email }); // ログを日本語に

        // 既存のメールアドレスがデータベースに存在するかを確認
        const existingUser = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
        console.log("📌 既存ユーザーの検索結果:", existingUser?.rowCount); // ログを日本語に

        // 既に同じメールアドレスで登録されているユーザーがいる場合
        if ((existingUser?.rowCount ?? 0) > 0) {
          return NextResponse.json({ error: "このメールアドレスは既に登録されています！" }, { status: 409 }); // 💡 日本語に
        }

        // パスワードのハッシュ化
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        console.log("🔒 ハッシュ化されたパスワード:", hashedPassword); // ログを日本語に

        // ユーザー情報をデータベースに保存
        await pool.query('INSERT INTO "User" (name, email, password) VALUES ($1, $2, $3)', [name, email, hashedPassword]);

        console.log("✔ ユーザー登録が完了しました！"); // ログを日本語に
        return NextResponse.json({ message: "ユーザー登録が成功しました！" }, { status: 201 }); // 💡 日本語に
      } catch (err) {
        console.error("🚨 ユーザー登録中にエラーが発生しました:", err); // ログを日本語に
        return NextResponse.json({ error: "ユーザー登録中にサーバーエラーが発生しました！" }, { status: 500 }); // 💡 日本語に
      }
    }

    // ユーザーログイン (type === "login") 処理
    if (type === "login") {
      try {
        console.log("🔍 ログインを試行:", email); // ログを日本語に

        // データベースからメールアドレスに基づいてユーザーを検索
        const userResult = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
        console.log("📌 ログインユーザーの検索結果:", userResult?.rowCount); // ログを日本語に

        // ユーザーが見つからない場合
        if (userResult.rowCount === 0) {
          return NextResponse.json({ error: "このメールアドレスは存在しません！" }, { status: 404 }); // 💡 日本語に
        }

        const user = userResult.rows[0]; // 検索されたユーザー情報

        // パスワードの検証
        const isPasswordValid = await bcrypt.compare(password, user.password);
        // パスワードが一致しない場合
        if (!isPasswordValid) {
          return NextResponse.json({ error: "パスワードが正しくありません！" }, { status: 401 }); // 💡 日本語に
        }

        // JWTトークンの発行
        const token = jwt.sign(
          { id: user.id, email: user.email, name: user.name }, // トークンに含めるペイロード (ユーザーID、メール、名前)
          process.env.JWT_SECRET || "default_secret", // JWTシークレット (本番環境では環境変数を使用し、強力な秘密鍵を設定すること)
          { expiresIn: "1h" } // トークンの有効期限
        );
        console.log("🔐 生成されたトークン:", token); // ログを日本語に

        // ログイン成功メッセージと発行されたトークンを応答として返却
        return NextResponse.json({ message: "ログインに成功しました！", token }, { status: 200 }); // 💡 日本語に
      } catch (err) {
        console.error("🚨 ログイン中にエラーが発生しました:", err); // ログを日本語に
        return NextResponse.json({ error: "ログイン中にサーバーエラーが発生しました！" }, { status: 500 }); // 💡 日本語に
      }
    }

    // 未知の 'type' が指定された場合
    return NextResponse.json({ error: "無効なリクエストです。" }, { status: 400 }); // 💡 日本語に
  } catch (error) {
    // 処理中に予期せぬサーバーエラーが発生した場合
    console.error("🚨 サーバーエラーが発生しました:", error); // ログを日本語に
    return NextResponse.json({ error: "サーバーエラーが発生しました！" }, { status: 500 }); // 💡 日本語に
  }
}