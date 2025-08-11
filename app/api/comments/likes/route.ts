// 📂 app/api/comments/like/route.ts

import { NextResponse, NextRequest } from 'next/server'; 
import { prisma } from '@/lib/prisma';
import { authenticateUser } from '@/lib/auth'; 

// コメントのいいねを作成する (POSTリクエスト)
export async function POST(request: NextRequest) { 
  try {
    const authenticatedUser = await authenticateUser(request);
    if (!authenticatedUser) {
      return NextResponse.json({ message: '認証が必要です。' }, { status: 401 });
    }

    const { commentId } = await request.json();

    if (!commentId) {
      return NextResponse.json({ message: 'commentId が必要です。' }, { status: 400 });
    }

    // すでにいいねを押しているか確認
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId: authenticatedUser.userId, // 認証されたユーザーIDを使用
          commentId: commentId,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json({ message: 'すでにいいね済みです。' }, { status: 409 }); // Conflict
    }

    const commentLike = await prisma.commentLike.create({
      data: {
        userId: authenticatedUser.userId, // 認証されたユーザーIDを使用
        commentId: commentId,
      },
    });

    return NextResponse.json(commentLike, { status: 201 });

  } catch (error) {
    console.error('コメントいいね作成エラー:', error);
    return NextResponse.json({ message: 'コメントいいねの作成に失敗しました。' }, { status: 500 });
  } 
}

// コメントのいいねを削除する (DELETEリクエスト)
export async function DELETE(request: NextRequest) { // request 타입을 NextRequest로 변경
  try {
    const authenticatedUser = await authenticateUser(request);
    if (!authenticatedUser) {
      return NextResponse.json({ message: '認証が必要です。' }, { status: 401 });
    }

    const { commentId } = await request.json();

    if (!commentId) {
      return NextResponse.json({ message: 'commentId が必要です。' }, { status: 400 });
    }

    const deletedLike = await prisma.commentLike.delete({
      where: {
        userId_commentId: {
          userId: authenticatedUser.userId, // 認証されたユーザーIDを使用
          commentId: commentId,
        },
      },
    });

    return NextResponse.json({ message: 'コメントいいねが削除されました。', deletedLikeId: deletedLike.id }, { status: 200 });

  } catch (error) {
    // いいねが存在せず削除に失敗する場合 (P2025) も処理
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ message: 'いいねが見つかりませんでした。' }, { status: 404 });
    }
    console.error('コメントいいね削除エラー:', error);
    return NextResponse.json({ message: 'コメントいいねの削除に失敗しました。' }, { status: 500 });
  }
}