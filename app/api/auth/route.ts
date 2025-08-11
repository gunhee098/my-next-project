// 📂 app/api/auth/route.ts

// [モジュールインポート]
import { NextResponse } from "next/server"; // Next.js のサーバーレスポンスを扱うためのモジュール
import { prisma } from "@/lib/prisma"; // ✅ Prisma クライアントをインポート。データベース操作に利用
import jwt from "jsonwebtoken"; // JWT (JSON Web Token) を生成・検証するためのライブラリ
import bcrypt from "bcryptjs"; // パスワードのハッシュ化と検証のためのライブラリ
import { Prisma } from '@prisma/client'; // Prisma のエラーハンドリングや型定義に利用するネームスペース

// [定数定義]
const SALT_ROUNDS = 10; // bcrypt のソルト生成強度。セキュリティとパフォーマンスのバランスを考慮

/**
 * @function POST
 * @description ユーザーの登録またはログイン処理を処理するAPIルートハンドラー。
 * リクエストボディの 'type' フィールドに基づいて処理を分岐します。
 * @param {Request} req - Next.js のリクエストオブジェクト
 * @returns {NextResponse} 処理結果に応じたJSONレスポンス
 *
 * @attention 重要: この関数内のロジックを変更する際は、認証フローが壊れないよう特に注意してください。
 * パスワードハッシュ化やJWT生成・検証ロジックはセキュリティに直結します。
 */
export async function POST(req: Request) {
  try {
    const body = await req.json(); // リクエストボディをJSONとしてパース
    console.log("📥 受信したリクエストデータ:", body); // 受信したデータ内容をログに出力
    // 環境変数 JWT_SECRET の設定状況を確認（本番環境では必須）
    console.log("🔑 JWT_SECRET:", process.env.JWT_SECRET ? "設定済み" : "未設定！");

    const { type, name, email, password } = body;

    // [入力値バリデーション - type]
    if (!type) {
      // type が 'login' または 'register' のいずれかであることを要求
      return NextResponse.json({ error: "type の値 (login または register) が必要です。" }, { status: 400 });
    }

    // [共通入力値バリデーション - email & password]
    if (!email || !password) {
      // メールアドレスとパスワードの入力必須チェック
      return NextResponse.json({ error: "メールアドレスとパスワードを入力してください！" }, { status: 400 });
    }

    // --- ユーザー登録 (type === "register") 処理 ---
    if (type === "register") {
      // [ユーザー名バリデーション]
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json({ error: "名前を入力してください！" }, { status: 400 });
      }

      try {
        console.log("🔍 ユーザー登録を試行:", { name, email });

        // [既存ユーザーの確認]
        const existingUser = await prisma.user.findUnique({
          where: { email: email },
        });
        console.log("📌 既存ユーザーの検索結果:", existingUser ? "存在します" : "存在しません");

        if (existingUser) {
          // 同じメールアドレスのユーザーが既に存在する場合
          return NextResponse.json({ error: "このメールアドレスは既に登録されています！" }, { status: 409 }); // 409 Conflict
        }

        // [パスワードのハッシュ化]
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        console.log("🔒 パスワードのハッシュ化が完了しました");

        // [新しいユーザーの作成]
        await prisma.user.create({
          data: {
            name: name,
            email: email,
            password: hashedPassword,
          },
        });

        console.log("✔ ユーザー登録が完了しました！");
        return NextResponse.json({ message: "ユーザー登録が成功しました！" }, { status: 201 }); // 201 Created
      } catch (error) {
        // [エラーハンドリング - ユーザー登録時]
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          console.error(`🚨 ユーザー登録中にデータベースエラーが発生しました [${error.code}]:`, error.message);
          // P2002: ユニーク制約違反（例: 既に登録されているメールアドレスで再度登録しようとした場合）
          if (error.code === 'P2002') {
            return NextResponse.json({ error: "このメールアドレスは既に登録されています！" }, { status: 409 });
          }
          return NextResponse.json({ error: `データベースエラーが発生しました: ${error.code}` }, { status: 500 });
        }
        console.error("🚨 ユーザー登録中に予期せぬエラーが発生しました:", error);
        return NextResponse.json({ error: "ユーザー登録中にサーバーエラーが発生しました！" }, { status: 500 });
      }
    }

    // --- ユーザーログイン (type === "login") 処理 ---
    if (type === "login") {
      try {
        console.log("🔍 ログインを試行:", email);

        // [ユーザーの検索]
        const user = await prisma.user.findUnique({
          where: { email: email },
        });
        console.log("📌 ログインユーザーの検索結果:", user ? "存在します" : "存在しません");

        if (!user) {
          // ユーザーが見つからない場合
          return NextResponse.json({ error: "このメールアドレスは存在しません！" }, { status: 404 }); // 404 Not Found
        }

        // [パスワードの検証]
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          // パスワードが一致しない場合
          return NextResponse.json({ error: "パスワードが正しくありません！" }, { status: 401 }); // 401 Unauthorized
        }

        // [JWT Secret Keyの確認]
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          // JWT_SECRET 環境変数が設定されていない場合（サーバー側の致命的なエラー）
          console.error("🚨 JWT_SECRET 環境変数が設定されていません。");
          return NextResponse.json({ error: "サーバー設定エラー：JWTシークレットがありません。" }, { status: 500 });
        }

        // [JWTの生成]
        const token = jwt.sign(
          { id: user.id, email: user.email, name: user.name }, // JWTペイロード
          jwtSecret, // シークレットキー
          { expiresIn: "1h" } // トークンの有効期限
        );
        console.log("🔐 トークンが正常に生成されました。"); // トークン本体のログ出力はセキュリティ上非推奨

        return NextResponse.json({ message: "ログインに成功しました！", token }, { status: 200 }); // 200 OK
      } catch (error) {
        // [エラーハンドリング - ログイン時]
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          console.error(`🚨 ログイン中にデータベースエラーが発生しました [${error.code}]:`, error.message);
          return NextResponse.json({ error: `データベースエラーが発生しました: ${error.code}` }, { status: 500 });
        }
        console.error("🚨 ログイン中に予期せぬエラーが発生しました:", error);
        return NextResponse.json({ error: "ログイン中にサーバーエラーが発生しました！" }, { status: 500 });
      }
    }

    // [無効なリクエストタイプ]
    // type が 'login' または 'register' のいずれでもない場合
    return NextResponse.json({ error: "無効なリクエストです。" }, { status: 400 }); // 400 Bad Request
  } catch (error) {
    // [最終的なサーバーエラーハンドリング]
    console.error("🚨 サーバーエラーが発生しました:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました！" }, { status: 500 });
    } 
}