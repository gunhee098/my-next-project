// 📂 app/api/comments/[commentId]/route.ts (コメント修正/削除 API ルート)

// Next.jsのAPIルートのためのモジュールをインポートします。
import { NextResponse, NextRequest } from 'next/server';
// Prisma ORMクライアントをインポートします。
import { PrismaClient } from '@prisma/client';
// ユーザー認証のためのヘルパー関数をインポートします。
import { authenticateUser } from '@/lib/auth';
// Next.jsのキャッシュを再検証するための関数をインポートします。
import { revalidatePath } from 'next/cache';

// PrismaClientのインスタンスを作成します。
const prisma = new PrismaClient();

/**
 * PUTリクエストハンドラ: コメント修正
 * 指定されたコメントIDのコメント内容を更新します。
 * @param {NextRequest} request - 受信したNext.jsのリクエストオブジェクト
 * @param {{ params: { commentId: string } }} - URLパラメータからcommentIdを取得
 * @returns {NextResponse} レスポンスオブジェクト
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { commentId: string } } // URLパラメータからcommentIdを取得
) {
  try {
    // ユーザー認証を行います。
    const authenticatedUser = await authenticateUser(request);
    // 認証されていない場合、エラーレスポンスを返します。
    if (!authenticatedUser) {
      return NextResponse.json({ message: '認証が必要です。' }, { status: 401 });
    }

    // URLパラメータからコメントIDと、リクエストボディから修正するコメント内容を取得します。
    const { commentId } = params;
    const { content } = await request.json();

    // commentIdまたはcontentが提供されていない場合、バリデーションエラーを返します。
    if (!commentId || !content) {
      return NextResponse.json({ message: 'commentIdとcontentは必須です。' }, { status: 400 });
    }

    // データベースから既存のコメントを検索し、その作成者IDと投稿IDを選択します。
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, postId: true } // revalidatePathで使用するため、postIdも一緒に選択
    });

    // コメントが見つからない場合、エラーレスポンスを返します。
    if (!existingComment) {
      return NextResponse.json({ message: 'コメントが見つかりませんでした。' }, { status: 404 });
    }

    // 認証されたユーザーがコメントの作成者であるかを確認します。
    // 作成者でない場合、権限エラーレスポンスを返します。
    if (existingComment.userId !== authenticatedUser.userId) {
      return NextResponse.json({ message: 'このコメントを編集する権限がありません。' }, { status: 403 });
    }

    // コメントの内容と更新日時を修正します。
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { content: content, updatedAt: new Date() },
    });

    // コメント修正後、該当する投稿の詳細ページのキャッシュを無効化します。
    revalidatePath(`/blog/${existingComment.postId}`);
    // デバッグ用にキャッシュ無効化のログを出力します。
    console.log(`Revalidated path /blog/${existingComment.postId} after comment update.`);

    // 成功ログを出力し、更新されたコメント情報を含む成功レスポンスを返します。
    console.log(`コメントAPI: コメントを更新しました！ - コメントID: ${commentId}, ユーザーID: ${authenticatedUser.userId}`);
    return NextResponse.json({ message: 'コメントが更新されました。', comment: updatedComment }, { status: 200 });

  } catch (error) {
    // エラーが発生した場合、コンソールにエラーを出力します。
    console.error('コメント更新エラー (PUT):', error);
    // サーバーエラーレスポンスを返します。
    return NextResponse.json({ message: 'コメントの更新に失敗しました。' }, { status: 500 });
  } finally {
    // Prismaクライアントの接続を切断します。
    await prisma.$disconnect();
  }
}

/**
 * DELETEリクエストハンドラ: コメント削除
 * 指定されたコメントIDのコメントを削除します。
 * @param {NextRequest} request - 受信したNext.jsのリクエストオブジェクト
 * @param {{ params: { commentId: string } }} - URLパラメータからcommentIdを取得
 * @returns {NextResponse} レスポンスオブジェクト
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { commentId: string } } // URLパラメータからcommentIdを取得
) {
  try {
    // ユーザー認証を行います。
    const authenticatedUser = await authenticateUser(request);
    // 認証されていない場合、エラーレスポンスを返します。
    if (!authenticatedUser) {
      return NextResponse.json({ message: '認証が必要です。' }, { status: 401 });
    }

    // URLパラメータからコメントIDを取得します。
    const { commentId } = params;

    // commentIdが提供されていない場合、バリデーションエラーを返します。
    if (!commentId) {
      return NextResponse.json({ message: 'commentIdは必須です。' }, { status: 400 });
    }

    // データベースから既存のコメントを検索し、その作成者IDと投稿IDを選択します。
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, postId: true } // revalidatePathで使用するため、postIdも一緒に選択
    });

    // コメントが見つからない場合、エラーレスポンスを返します。
    if (!existingComment) {
      return NextResponse.json({ message: 'コメントが見つかりませんでした。' }, { status: 404 });
    }

    // 認証されたユーザーがコメントの作成者であるかを確認します。
    // 作成者でない場合、権限エラーレスポンスを返します。
    if (existingComment.userId !== authenticatedUser.userId) {
      return NextResponse.json({ message: 'このコメントを削除する権限がありません。' }, { status: 403 });
    }

    // コメントをデータベースから削除します。
    await prisma.comment.delete({
      where: { id: commentId },
    });

    // コメント削除後、該当する投稿の詳細ページのキャッシュを無効化します。
    revalidatePath(`/blog/${existingComment.postId}`);
    // キャッシュ無効化のログを出力します。
    console.log(`Revalidated path /blog/${existingComment.postId} after comment deletion.`);

    // 成功ログを出力し、成功レスポンスを返します。
    console.log(`コメントAPI: コメントを削除しました！ - コメントID: ${commentId}, ユーザーID: ${authenticatedUser.userId}`);
    return NextResponse.json({ message: 'コメントが削除されました。' }, { status: 200 });

  } catch (error) {
    // PrismaのエラーコードP2025 (削除しようとしたレコードが見つからない) の場合、404を返します。
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ message: '削除するコメントが見つかりませんでした。' }, { status: 404 });
    }
    // その他のエラーの場合、コンソールにエラーを出力します。
    console.error('コメント削除エラー (DELETE):', error);
    // サーバーエラーレスポンスを返します。
    return NextResponse.json({ message: 'コメントの削除に失敗しました。' }, { status: 500 });
  } finally {
    // Prismaクライアントの接続を切断します。
    await prisma.$disconnect();
  }
}