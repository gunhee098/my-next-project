// 📂 app/api/comments/like/route.ts

// Next.jsのAPIルートのためのモジュールとNextRequestをインポートします。
import { NextResponse, NextRequest } from 'next/server';
// Prisma ORMクライアントをインポートします。
import { PrismaClient } from '@prisma/client';
// ユーザー認証のためのヘルパー関数をインポートします。
import { authenticateUser } from '@/lib/auth';

// PrismaClientのインスタンスを作成します。
const prisma = new PrismaClient();

/**
 * POSTリクエストハンドラ: コメントのいいね作成
 * 指定されたコメントに対するユーザーのいいねを作成します。
 * @param {NextRequest} request - 受信したNext.jsのリクエストオブジェクト
 * @returns {NextResponse} レスポンスオブジェクト
 */
export async function POST(request: NextRequest) {
  try {
    // ユーザー認証を行います。
    const authenticatedUser = await authenticateUser(request);
    // 認証されていない場合、エラーレスポンスを返します。
    if (!authenticatedUser) {
      return NextResponse.json({ message: '認証が必要です。' }, { status: 401 });
    }

    // リクエストボディからcommentIdを取得します。
    const { commentId } = await request.json();

    // commentIdが提供されていない場合、バリデーションエラーを返します。
    if (!commentId) {
      return NextResponse.json({ message: 'commentIdは必須です。' }, { status: 400 });
    }

    // ユーザーがすでにこのコメントに「いいね」しているかを確認します。
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: { // 複合ユニークキーを使用して検索
          userId: authenticatedUser.userId, // 認証されたユーザーIDを使用
          commentId: commentId,
        },
      },
    });

    // すでに「いいね」済みの場合、コンフリクトエラーを返します。
    if (existingLike) {
      return NextResponse.json({ message: 'すでにいいね済みです。' }, { status: 409 }); // Conflict (競合)
    }

    // 新しいコメントの「いいね」レコードを作成します。
    const commentLike = await prisma.commentLike.create({
      data: {
        userId: authenticatedUser.userId, // 認証されたユーザーIDを使用
        commentId: commentId,
      },
    });

    // 成功した「いいね」レコード情報を含む成功レスポンスを返します。
    return NextResponse.json(commentLike, { status: 201 }); // Created (作成済み)

  } catch (error) {
    // エラーが発生した場合、コンソールにエラーを出力します。
    console.error('コメントいいね作成エラー:', error);
    // サーバーエラーレスポンスを返します。
    return NextResponse.json({ message: 'コメントいいねの作成に失敗しました。' }, { status: 500 });
  } finally {
    // Prismaクライアントの接続を切断します。
    await prisma.$disconnect();
  }
}

/**
 * DELETEリクエストハンドラ: コメントのいいね削除
 * 指定されたコメントに対するユーザーのいいねを削除します。
 * @param {NextRequest} request - 受信したNext.jsのリクエストオブジェクト
 * @returns {NextResponse} レスポンスオブジェクト
 */
export async function DELETE(request: NextRequest) {
  try {
    // ユーザー認証を行います。
    const authenticatedUser = await authenticateUser(request);
    // 認証されていない場合、エラーレスポンスを返します。
    if (!authenticatedUser) {
      return NextResponse.json({ message: '認証が必要です。' }, { status: 401 });
    }

    // リクエストボディからcommentIdを取得します。
    const { commentId } = await request.json();

    // commentIdが提供されていない場合、バリデーションエラーを返します。
    if (!commentId) {
      return NextResponse.json({ message: 'commentIdは必須です。' }, { status: 400 });
    }

    // 指定されたユーザーとコメントの組み合わせで「いいね」レコードを削除します。
    const deletedLike = await prisma.commentLike.delete({
      where: {
        userId_commentId: { // 複合ユニークキーを使用して削除対象を特定
          userId: authenticatedUser.userId, // 認証されたユーザーIDを使用
          commentId: commentId,
        },
      },
    });

    // 成功メッセージと削除された「いいね」のIDを含む成功レスポンスを返します。
    return NextResponse.json({ message: 'コメントいいねが削除されました。', deletedLikeId: deletedLike.id }, { status: 200 });

  } catch (error) {
    // PrismaのエラーコードP2025 (削除しようとしたレコードが見つからない) の場合、404を返します。
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ message: 'いいねが見つかりませんでした。' }, { status: 404 });
    }
    // その他のエラーの場合、コンソールにエラーを出力します。
    console.error('コメントいいね削除エラー:', error);
    // サーバーエラーレスポンスを返します。
    return NextResponse.json({ message: 'コメントいいねの削除に失敗しました。' }, { status: 500 });
  } finally {
    // Prismaクライアントの接続を切断します。
    await prisma.$disconnect();
  }
}