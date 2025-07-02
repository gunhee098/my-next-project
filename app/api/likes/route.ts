// 📂 app/api/likes/route.ts 
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ✅ Prismaクライアントをインポートします。
import jwt from "jsonwebtoken"; // JWT (JSON Web Token) ライブラリを使用します。
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'; // Prismaエラータイプをインポートします。

// JWT トークン デコーディング インターフェース
interface DecodedToken {
  id: string; // ユーザーID (PrismaのUUIDに合わせ string タイプ)
  email: string;
  name: string;
  iat: number; // トークン発行時間
  exp: number; // トークン有効期限
}

// JWTを検証し、認証されたユーザー情報を取得する関数 (Liked APIで再検証)
function getAuthenticatedUserFromToken(req: NextRequest) { // 함수 이름 변경
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  console.log("--- いいねAPI デバッグ (いいねAPI内部認証) ---");
  console.log("いいねAPI: 受信したAuthorizationヘッダー:", authHeader);
  console.log("いいねAPI: 抽出されたトークン:", token ? token.substring(0, 10) + '...' : "トークンなし");

  if (!token) {
    console.warn("いいねAPI: トークンがlikes APIに到達しませんでした。");
    return null;
  }

  try {
    // JWT_SECRET 環境変数が設定されていることを再度確認
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("いいねAPI: 環境変数 JWT_SECRET が設定されていません。");
      return null; // JWT_SECRETがない場合は認証失敗
    }
    
    const decoded = jwt.verify(token, jwtSecret);
    console.log("いいねAPI: JWT検証完了。デコードされたユーザーID:", (decoded as any).id);
    return decoded as DecodedToken;
  } catch (error) {
    console.error("いいねAPI: JWT検証失敗:", (error as Error).message);
    return null;
  }
}

// [POST] いいね追加/取り消し (Toggle Like) 処理ハンドラー
export async function POST(req: NextRequest) {
  let newLikeStatus = false;
  try {
    // 1. いいねAPI内部で認証されたユーザー情報を取得します。
    const user = getAuthenticatedUserFromToken(req); // 내부 함수 호출
    if (!user || !user.id) {
      console.error("いいねAPI: ユーザー情報を認証できませんでした。");
      return NextResponse.json({ error: "認証が必要です！" }, { status: 401 });
    }
    const userId = user.id;

    const { postId } = await req.json();
    if (!postId) {
      console.error("いいねAPI: postIdがリクエスト本文にありません。");
      return NextResponse.json({ error: "postIdは必須です！" }, { status: 400 });
    }

    const transactionResult = await prisma.$transaction(async (prisma) => {
      const like = await prisma.like.findUnique({
        where: {
          userId_postId: {
            postId: postId,
            userId: userId,
          },
        },
      });

      let message = "";
      let result;

      if (like) {
        result = await prisma.like.delete({
          where: {
            userId_postId: {
              postId: postId,
              userId: userId,
            },
          },
        });
        message = "いいねを取り消しました！";
        newLikeStatus = false;
      } else {
        result = await prisma.like.create({
          data: {
            postId: postId,
            userId: userId,
          },
        });
        message = "いいねしました！";
        newLikeStatus = true;
      }
      return { message, newLikeStatus };
    });

    console.log(`いいねAPI: ${transactionResult.message} - 投稿ID: ${postId}, ユーザーID: ${userId}`);
    return NextResponse.json({ message: transactionResult.message, newLikeStatus: transactionResult.newLikeStatus }, { status: 200 });

  } catch (error) {
    console.error("いいねAPI: エラーが発生しました:", error);
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        console.warn("いいねAPI: 重複したいいねの試行 (Prisma P2002)。");
        return NextResponse.json({ error: "すでにいいねされています！" }, { status: 409 });
      }
      return NextResponse.json({ error: `データベースエラーが発生しました: ${error.code}` }, { status: 500 });
    }
    return NextResponse.json({ error: "サーバーエラーが発生しました！" }, { status: 500 });
  }
}