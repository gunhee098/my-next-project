// 📂 app/api/likes/route.ts (게시물 좋아요 생성/삭제 API 라우트)

import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '@/lib/auth';

const prisma = new PrismaClient();

// POST 요청: 좋아요 생성 (또는 토글)
export async function POST(request: NextRequest) {
  try {
    const authenticatedUser = await authenticateUser(request);
    if (!authenticatedUser) {
      return NextResponse.json({ message: '認証が必要です。' }, { status: 401 });
    }

    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json({ message: 'postId が必要です。' }, { status: 400 });
    }

    // 이미 좋아요를 눌렀는지 확인
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: authenticatedUser.userId,
          postId: postId,
        },
      },
    });

    if (existingLike) {
      // 이미 좋아요가 있다면 삭제 (토글 기능)
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId: authenticatedUser.userId,
            postId: postId,
          },
        },
      });
      console.log(`いいねAPI: いいねを取り消しました！ - 投稿ID: ${postId}, ユーザーID: ${authenticatedUser.userId}`);
      return NextResponse.json({ message: 'いいねが取り消されました。', isLiked: false }, { status: 200 }); // 200 OK
    } else {
      // 좋아요가 없다면 생성
      const newLike = await prisma.like.create({
        data: {
          userId: authenticatedUser.userId,
          postId: postId,
        },
      });
      console.log(`いいねAPI: いいねしました！ - 投稿ID: ${postId}, ユーザーID: ${authenticatedUser.userId}`);
      return NextResponse.json({ message: 'いいねが追加されました。', isLiked: true, like: newLike }, { status: 201 }); // 201 Created
    }

  } catch (error) {
    console.error('いいね操作エラー (POST):', error);
    return NextResponse.json({ message: 'いいねの操作に失敗しました。' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE 요청: 좋아요 삭제 (명시적 삭제)
// handleLikeToggle에서 method = isLiked ? "DELETE" : "POST"; 라고 설정했기 때문에,
// isLiked가 true일 때 DELETE 요청이 오도록 설계되어 있습니다.
// 따라서 DELETE 메서드를 명시적으로 구현해야 합니다.
export async function DELETE(request: NextRequest) {
  try {
    const authenticatedUser = await authenticateUser(request);
    if (!authenticatedUser) {
      return NextResponse.json({ message: '認証が必要です。' }, { status: 401 });
    }

    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json({ message: 'postId が必要です。' }, { status: 400 });
    }

    const deletedLike = await prisma.like.delete({
      where: {
        userId_postId: {
          userId: authenticatedUser.userId,
          postId: postId,
        },
      },
    });
    console.log(`いいねAPI: いいねを取り消しました！ - 投稿ID: ${postId}, ユーザーID: ${authenticatedUser.userId}`);
    
    // 이 부분을 수정합니다: deletedLike.id 대신 userId와 postId를 반환합니다.
    return NextResponse.json(
      { 
        message: 'いいねが取り消されました。', 
        deletedUserId: deletedLike.userId,   // <--- 추가
        deletedPostId: deletedLike.postId    // <--- 추가
      }, 
      { status: 200 }
    );

  } catch (error) {
    // 좋아요가 존재하지 않아 삭제에 실패하는 경우 (P2025) 처리
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ message: 'いいねが見つかりませんでした。' }, { status: 404 });
    }
    console.error('いいね操作エラー (DELETE):', error);
    return NextResponse.json({ message: 'いいねの操作に失敗しました。' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}