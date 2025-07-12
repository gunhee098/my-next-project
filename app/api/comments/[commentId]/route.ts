// 📂 app/api/comments/[commentId]/route.ts (コメント修正/削除 API ラウト)

import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '@/lib/auth';

const prisma = new PrismaClient();

// PUT リクエスト: コメント修正
export async function PUT(
  request: NextRequest,
  { params }: { params: { commentId: string } } // URL パラメータから commentId を取得
) {
  try {
    const authenticatedUser = await authenticateUser(request);
    if (!authenticatedUser) {
      return NextResponse.json({ message: '認証が必要です。' }, { status: 401 });
    }

    const { commentId } = params;
    const { content } = await request.json(); // 修正するコメント内容

    if (!commentId || !content) {
      return NextResponse.json({ message: 'commentId と content が必要です。' }, { status: 400 });
    }

    // コメントの存在と作成者を確認
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment) {
      return NextResponse.json({ message: 'コメントが見つかりませんでした。' }, { status: 404 });
    }

    // 認証されたユーザーがコメントの作成者であるか確認
    if (existingComment.userId !== authenticatedUser.userId) {
      return NextResponse.json({ message: 'このコメントを編集する権限がありません。' }, { status: 403 });
    }

    // コメントを修正
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { content: content, updatedAt: new Date() }, // 更新日時も更新
    });

    console.log(`コメントAPI: コメントを更新しました！ - コメントID: ${commentId}, ユーザーID: ${authenticatedUser.userId}`);
    return NextResponse.json({ message: 'コメントが更新されました。', comment: updatedComment }, { status: 200 });

  } catch (error) {
    console.error('コメント更新エラー (PUT):', error);
    return NextResponse.json({ message: 'コメントの更新に失敗しました。' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE リクエスト: コメント削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { commentId: string } } // URL パラメータから commentId を取得
) {
  try {
    const authenticatedUser = await authenticateUser(request);
    if (!authenticatedUser) {
      return NextResponse.json({ message: '認証が必要です。' }, { status: 401 });
    }

    const { commentId } = params;

    if (!commentId) {
      return NextResponse.json({ message: 'commentId が必要です。' }, { status: 400 });
    }

    // コメントの存在と作成者を確認
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment) {
      return NextResponse.json({ message: 'コメントが見つかりませんでした。' }, { status: 404 });
    }

    // 認証されたユーザーがコメントの作成者であるか確認
    if (existingComment.userId !== authenticatedUser.userId) {
      return NextResponse.json({ message: 'このコメントを削除する権限がありません。' }, { status: 403 });
    }

    // コメントを削除
    await prisma.comment.delete({
      where: { id: commentId },
    });

    console.log(`コメントAPI: コメントを削除しました！ - コメントID: ${commentId}, ユーザーID: ${authenticatedUser.userId}`);
    return NextResponse.json({ message: 'コメントが削除されました。' }, { status: 200 });

  } catch (error) {
    // コメントが存在せず削除に失敗する場合 (P2025) の処理
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ message: '削除するコメントが見つかりませんでした。' }, { status: 404 });
    }
    console.error('コメント削除エラー (DELETE):', error);
    return NextResponse.json({ message: 'コメントの削除に失敗しました。' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}