// 📂 app/api/likes/status/route.ts

// Next.jsのAPIルートのためのモジュールをインポートします。
import { NextResponse, NextRequest } from 'next/server';
// Prisma ORMクライアントをインポートします。
import { PrismaClient } from '@prisma/client';
// ユーザー認証のためのヘルパー関数をインポートします。
import { authenticateUser } from '@/lib/auth';

// PrismaClientのインスタンスを作成します。
const prisma = new PrismaClient();

/**
 * GETリクエストハンドラ: いいね状態の取得
 * 特定のユーザーが特定の投稿に「いいね」しているかどうかを確認します。
 * @param {NextRequest} request - 受信したNext.jsのリクエストオブジェクト
 * @returns {NextResponse} いいね状態を示すレスポンスオブジェクト
 */
export async function GET(request: NextRequest) {
  try {
    // リクエストURLからURLSearchParamsオブジェクトを生成し、クエリパラメータを取得します。
    const url = new URL(request.url);
    const postId = url.searchParams.get('postId'); // 投稿IDを取得
    const userId = url.searchParams.get('userId'); // クライアントから送信されたユーザーID (クエリパラメータ)

    // デバッグ用に受信したクエリパラメータをログに出力します。
    console.log(`[LikesStatus API] Received postId: ${postId}, userId from Query: ${userId}`);

    // postIdまたはuserIdのクエリパラメータが不足している場合、エラーを返します。
    if (!postId || !userId) {
      return NextResponse.json({ message: 'postIdまたはuserIdのクエリパラメータが不足しています。' }, { status: 400 });
    }

    // トークンを検証し、認証されたユーザー情報を取得します。
    const authenticatedUser = await authenticateUser(request); // サーバーがトークンから認証したユーザー情報

    // --- ここからデバッグログを追加します。 ---
    // authenticateUser関数の結果全体をログに出力します。
    console.log(`[LikesStatus API] AuthenticateUser result:`, authenticatedUser);
    // 認証に失敗した場合
    if (!authenticatedUser) {
      console.warn(`[LikesStatus API] Authentication failed: No authenticated user. Returning 401.`);
      return NextResponse.json({ message: '認証が必要です。' }, { status: 401 });
    }

    // トークンから抽出されたユーザーIDと、クエリパラメータから受け取ったユーザーIDをログに出力します。
    console.log(`[LikesStatus API] Authenticated User ID from Token: ${authenticatedUser.userId}`);
    console.log(`[LikesStatus API] User ID from Query Parameter: ${userId}`);

    // トークンから認証されたユーザーIDと、クエリパラメータのユーザーIDが一致しない場合、権限エラーを返します。
    // これは、他のユーザーのいいね状態を勝手に確認しようとする試みを防ぎます。
    if (authenticatedUser.userId !== userId) {
      console.warn(`[LikesStatus API] Forbidden: Mismatched user IDs. Returning 403.`);
      return NextResponse.json({ message: '認証情報が一致しません。' }, { status: 403 });
    }
    // ------------------------------------

    // 指定されたユーザーと投稿の組み合わせで「いいね」レコードを検索します。
    const like = await prisma.like.findUnique({
      where: {
        userId_postId: { // 複合ユニークキーを使用して検索
          userId: authenticatedUser.userId, // 認証されたユーザーIDを使用
          postId: postId,
        },
      },
    });

    // 「いいね」レコードが見つかれば true、見つからなければ false を返します。
    return NextResponse.json({ isLiked: !!like }); // !!like はlikeが存在すればtrue, null/undefinedならfalse

  } catch (error) {
    // エラーが発生した場合、コンソールにエラーを出力します。
    console.error('いいね状態の取得エラー:', error);
    // サーバーエラーレスポンスを返します。
    return NextResponse.json({ message: 'いいね状態の取得に失敗しました。' }, { status: 500 });
  } finally {
    // Prismaクライアントの接続を切断します。
    await prisma.$disconnect();
  }
}