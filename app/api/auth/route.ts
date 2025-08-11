// 📂 app/api/auth/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const SALT_ROUNDS = 10;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📥 受信したリクエストデータ:", body);
    console.log("🔑 JWT_SECRET:", process.env.JWT_SECRET ? "設定済み" : "未設定！");

    const { type, name, email, password } = body;

    if (!type) {
      return NextResponse.json({ error: "type の値 (login または register) が必要です。" }, { status: 400 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: "メールアドレスとパスワードを入力してください！" }, { status: 400 });
    }

    if (type === "register") {
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json({ error: "名前を入力してください！" }, { status: 400 });
      }

      try {
        console.log("🔍 ユーザー登録を試行:", { name, email });

        const existingUser = await prisma.user.findUnique({
          where: { email: email },
        });
        console.log("📌 既存ユーザーの検索結果:", existingUser ? "存在します" : "存在しません");

        if (existingUser) {
          return NextResponse.json({ error: "このメールアドレスは既に登録されています！" }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        console.log("🔒 パスワードのハッシュ化が完了しました");

        await prisma.user.create({
          data: {
            name: name,
            email: email,
            password: hashedPassword,
          },
        });

        console.log("✔ ユーザー登録が完了しました！");
        return NextResponse.json({ message: "ユーザー登録が成功しました！" }, { status: 201 });
      } catch (error: unknown) {
        if (error instanceof PrismaClientKnownRequestError) {
          console.error(`🚨 ユーザー登録中にデータベースエラーが発生しました [${error.code}]:`, error.message);
          if (error.code === 'P2002') {
            return NextResponse.json({ error: "このメールアドレスは既に登録されています！" }, { status: 409 });
          }
          return NextResponse.json({ error: `データベースエラーが発生しました: ${error.code}` }, { status: 500 });
        }
        console.error("🚨 ユーザー登録中に予期せぬエラーが発生しました:", error);
        return NextResponse.json({ error: "ユーザー登録中にサーバーエラーが発生しました！" }, { status: 500 });
      }
    }

    if (type === "login") {
      try {
        console.log("🔍 ログインを試行:", email);

        const user = await prisma.user.findUnique({
          where: { email: email },
        });
        console.log("📌 ログインユーザーの検索結果:", user ? "存在します" : "存在しません");

        if (!user) {
          return NextResponse.json({ error: "このメールアドレスは存在しません！" }, { status: 404 });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return NextResponse.json({ error: "パスワードが正しくありません！" }, { status: 401 });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          console.error("🚨 JWT_SECRET 環境変数が設定されていません。");
          return NextResponse.json({ error: "サーバー設定エラー：JWTシークレットがありません。" }, { status: 500 });
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, name: user.name },
          jwtSecret,
          { expiresIn: "1h" }
        );
        console.log("🔐 トークンが正常に生成されました。");

        return NextResponse.json({ message: "ログインに成功しました！", token }, { status: 200 });
      } catch (error: unknown) {
        if (error instanceof PrismaClientKnownRequestError) {
          console.error(`🚨 ログイン中にデータベースエラーが発生しました [${error.code}]:`, error.message);
          return NextResponse.json({ error: `データベースエラーが発生しました: ${error.code}` }, { status: 500 });
        }
        console.error("🚨 ログイン中に予期せぬエラーが発生しました:", error);
        return NextResponse.json({ error: "ログイン中にサーバーエラーが発生しました！" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "無効なリクエストです。" }, { status: 400 });
  } catch (error: unknown) {
    console.error("🚨 サーバーエラーが発生しました:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました！" }, { status: 500 });
  }
}