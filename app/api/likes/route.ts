// 📂 app/api/likes/route.ts (投稿のいいね作成/削除 API ルート)

// Next.jsのAPIルートのためのモジュールをインポートします。
import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
// ユーザー認証のためのヘルパー関数をインポートします。
import { authenticateUser } from '@/lib/auth';

/**
 * POSTリクエストハンドラ: いいねの作成 (またはトグル)
 * 指定された投稿に対するユーザーのいいねを作成します。すでにいいね済みの場合、それを削除します（トグル機能）。
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

    // リクエストボディからpostIdを取得します。
    const { postId } = await request.json();

    // postIdが提供されていない場合、バリデーションエラーを返します。
    if (!postId) {
      return NextResponse.json({ message: 'postIdは必須です。' }, { status: 400 });
    }

    // ユーザーがすでにこの投稿に「いいね」しているかを確認します。
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: { // 複合ユニークキーを使用して検索
          userId: authenticatedUser.userId,
          postId: postId,
        },
      },
    });

    if (existingLike) {
      // すでに「いいね」がある場合、それを削除します（トグル機能）。
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId: authenticatedUser.userId,
            postId: postId,
          },
        },
      });
      // ログを出力し、いいねが取り消されたことを示すレスポンスを返します。
      console.log(`いいねAPI: いいねを取り消しました！ - 投稿ID: ${postId}, ユーザーID: ${authenticatedUser.userId}`);
      return NextResponse.json({ message: 'いいねが取り消されました。', isLiked: false }, { status: 200 }); // 200 OK
    } else {
      // 「いいね」がない場合、新しく作成します。
      const newLike = await prisma.like.create({
        data: {
          userId: authenticatedUser.userId,
          postId: postId,
        },
      });
      // ログを出力し、いいねが追加されたことを示すレスポンスを返します。
      console.log(`いいねAPI: いいねしました！ - 投稿ID: ${postId}, ユーザーID: ${authenticatedUser.userId}`);
      return NextResponse.json({ message: 'いいねが追加されました。', isLiked: true, like: newLike }, { status: 201 }); // 201 Created
    }

  } catch (error) {
    // エラーが発生した場合、コンソールにエラーを出力し、サーバーエラーレスポンスを返します。
    console.error('いいね操作エラー (POST):', error);
    return NextResponse.json({ message: 'いいねの操作に失敗しました。' }, { status: 500 });
  } 
}

/**
 * DELETEリクエストハンドラ: いいねの削除 (明示的な削除)
 * 指定された投稿に対するユーザーのいいねを削除します。
 * (注: クライアント側のhandleLikeToggleで isLiked ? "DELETE" : "POST" と設定されているため、
 * いいね済みの場合はこのDELETEメソッドが呼び出されるように設計されています。)
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

    // リクエストボディからpostIdを取得します。
    const { postId } = await request.json();

    // postIdが提供されていない場合、バリデーションエラーを返します。
    if (!postId) {
      return NextResponse.json({ message: 'postIdは必須です。' }, { status: 400 });
    }

    // 指定されたユーザーと投稿の組み合わせで「いいね」レコードを削除します。
    const deletedLike = await prisma.like.delete({
      where: {
        userId_postId: { // 複合ユニークキーを使用して削除対象を特定
          userId: authenticatedUser.userId,
          postId: postId,
        },
      },
    });
    // ログを出力します。
    console.log(`いいねAPI: いいねを取り消しました！ - 投稿ID: ${postId}, ユーザーID: ${authenticatedUser.userId}`);

    // 削除されたいいねの情報（ユーザーIDと投稿ID）を含む成功レスポンスを返します。
    // deletedLike.id の代わりに userId と postId を返します。
    return NextResponse.json(
      {
        message: 'いいねが取り消されました。',
        deletedUserId: deletedLike.userId,   // 削除されたユーザーIDを追加
        deletedPostId: deletedLike.postId    // 削除された投稿IDを追加
      },
      { status: 200 }
    );

  } catch (error) {
    // 「いいね」が存在せず削除に失敗する場合 (Prismaのエラーコード P2025) を処理します。
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ message: 'いいねが見つかりませんでした。' }, { status: 404 });
    }
    // その他のエラーの場合、コンソールにエラーを出力し、サーバーエラーレスポンスを返します。
    console.error('いいね操作エラー (DELETE):', error);
    return NextResponse.json({ message: 'いいねの操作に失敗しました。' }, { status: 500 });
  } 
}