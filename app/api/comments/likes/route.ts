// 📂 app/api/comments/like/route.ts

import { NextResponse, NextRequest } from 'next/server'; // NextRequest를 추가로 임포트
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '@/lib/auth'; // authenticateUser를 임포트

const prisma = new PrismaClient();

// 댓글 좋아요 생성 (POST 요청)
export async function POST(request: NextRequest) { // request 타입을 NextRequest로 변경
  try {
    const authenticatedUser = await authenticateUser(request);
    if (!authenticatedUser) {
      return NextResponse.json({ message: '認証が必要です。' }, { status: 401 });
    }

    const { commentId } = await request.json();

    if (!commentId) {
      return NextResponse.json({ message: 'commentId が必要です。' }, { status: 400 });
    }

    // 이미 좋아요를 눌렀는지 확인
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId: authenticatedUser.userId, // 인증된 사용자 ID 사용
          commentId: commentId,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json({ message: 'すでにいいね済みです。' }, { status: 409 }); // Conflict
    }

    const commentLike = await prisma.commentLike.create({
      data: {
        userId: authenticatedUser.userId, // 인증된 사용자 ID 사용
        commentId: commentId,
      },
    });

    return NextResponse.json(commentLike, { status: 201 });

  } catch (error) {
    console.error('コメントいいね作成エラー:', error);
    return NextResponse.json({ message: 'コメントいいねの作成に失敗しました。' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// 댓글 좋아요 삭제 (DELETE 요청)
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
          userId: authenticatedUser.userId, // 인증된 사용자 ID 사용
          commentId: commentId,
        },
      },
    });

    return NextResponse.json({ message: 'コメントいいねが削除されました。', deletedLikeId: deletedLike.id }, { status: 200 });

  } catch (error) {
    // 좋아요가 존재하지 않아 삭제에 실패하는 경우 (P2025)도 처리
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ message: 'いいねが見つかりませんでした。' }, { status: 404 });
    }
    console.error('コメントいいね削除エラー:', error);
    return NextResponse.json({ message: 'コメントいいねの削除に失敗しました。' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}