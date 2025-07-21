// 📂 app/api/comments/route.ts

// Next.js のサーバーサイドAPIルートのためのNextResponseとNextRequestをインポートします。
import { NextResponse, NextRequest } from 'next/server';
// PrismaClient および Prisma 固有のエラータイプをインポートします。
import { PrismaClient, Prisma } from '@prisma/client';
// PrismaClientKnownRequestErrorは、特定のPrismaデータベースエラーを捕捉するために使用します。
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// ユーザー認証のためのヘルパー関数をインポートします。
import { authenticateUser } from '@/lib/auth';

// PrismaClientのインスタンスを作成します。これによりデータベース操作が可能になります。
const prisma = new PrismaClient();

/**
 * POSTハンドラー: 新しいコメントを作成するAPIエンドポイント
 * @param {NextRequest} req - 受信したNext.jsのリクエストオブジェクト
 * @returns {NextResponse} レスポンスオブジェクト
 */
export async function POST(req: NextRequest) {
  try {
    // ユーザー認証を行います。認証ヘッダーからトークンを検証します。
    const authResult = await authenticateUser(req);
    // 認証が失敗した場合の処理。
    if (!authResult) {
      console.warn("コメント作成: 認証が必要です。トークンが無効か存在しません。");
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 }); // 401 Unauthorized レスポンス
    }
    // 認証されたユーザーのIDを取得します。
    const { userId } = authResult;

    // リクエストボディからコメントの内容(content)と、関連する投稿ID(postId)を取得します。
    const { content, postId } = await req.json();

    // コメント内容または投稿IDが欠けている場合のバリデーション。
    if (!content || !postId) {
      console.warn("コメント作成: コメントの内容または投稿IDが不足しています。");
      return NextResponse.json({ error: 'コメント内容と投稿IDは必須です。' }, { status: 400 }); // 400 Bad Request
    }

    // Prisma を使用して新しいコメントをデータベースに作成します。
    const newComment = await prisma.comment.create({
      data: {
        content, // コメント内容
        userId,  // コメント作成者のID
        postId,  // 関連する投稿のID
      },
    });

    console.log("✔ 新しいコメントが正常に作成されました:", newComment);
    // 作成されたコメントデータと201 Createdステータスを返します。
    return NextResponse.json(newComment, { status: 201 });

  } catch (error) {
    // PrismaClientKnownRequestError の場合、データベース関連のエラーとしてログを記録し、特定のエラーコードを返します。
    if (error instanceof PrismaClientKnownRequestError) {
        console.error(`🚨 コメント作成中にデータベースエラーが発生しました [${error.code}]:`, error.message);
        return NextResponse.json({ error: `データベースエラーが発生しました: ${error.code}` }, { status: 500 });
    }
    // その他の予期せぬエラーの場合のログ。
    console.error("🚨 コメント作成中に予期せぬエラーが発生しました:", error);
    // その他のエラーの場合、一般的なサーバーエラーを返します。
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  } finally {
    // リクエスト処理の最後にデータベース接続を必ず切断します。
    await prisma.$disconnect();
  }
}

/**
 * GETハンドラー: 特定の投稿のコメントを取得するAPIエンドポイント
 * 例: /api/comments?postId=clxyxyxyx
 * @param {NextRequest} req - 受信したNext.jsのリクエストオブジェクト
 * @returns {NextResponse} レスポンスオブジェクト
 */
export async function GET(req: NextRequest) {
  try {
    // リクエストURLからURLSearchParamsオブジェクトを生成します。
    const { searchParams } = new URL(req.url);
    // 'postId' クエリパラメータの値を取得します。
    const postId = searchParams.get('postId');

    // postId が指定されていない場合の処理。
    if (!postId) {
      console.warn("コメント取得: 投稿IDが不足しています。");
      return NextResponse.json({ error: 'コメントを取得するには投稿IDが必要です。' }, { status: 400 }); // 400 Bad Request
    }

    // ユーザー認証 (コメント取得には認証を必須としないケースもありますが、ここではAPIの一貫性のため含めます。)
    // もし認証不要に変更したい場合は、authResult 関連のロジックを削除してください。
    const authResult = await authenticateUser(req);
    if (!authResult) {
      console.warn("コメント取得: 認証が必要です。トークンが無効か存在しません。");
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    // 特定の投稿に関連するコメントをPrismaを使用してデータベースから取得します。
    // コメントを作成したユーザーの情報 (IDと名前のみ) も一緒に取得します。
    const comments = await prisma.comment.findMany({
      where: {
        postId: postId, // 指定された投稿IDに一致するコメント
      },
      include: {
        user: { // コメントを作成したユーザーの情報を取得するための関連付け
          select: {
            id: true,   // ユーザーID
            name: true, // ユーザー名のみ選択
          },
        },
      },
      orderBy: { // コメントを新しい順にソート (createdAt の降順)
        createdAt: 'desc',
      },
    });

    console.log(`✔ 投稿ID ${postId} のコメントが正常に取得されました。件数:`, comments.length);
    // 取得したコメントデータをJSON形式で返します。
    return NextResponse.json(comments);

  } catch (error) {
    // エラーハンドリングはPOSTハンドラーと同様です。
    // PrismaClientKnownRequestError の場合、データベース関連のエラーをログに記録し返します。
    if (error instanceof PrismaClientKnownRequestError) {
        console.error(`🚨 コメント取得中にデータベースエラーが発生しました [${error.code}]:`, error.message);
        return NextResponse.json({ error: `データベースエラーが発生しました: ${error.code}` }, { status: 500 });
    }
    // その他の予期せぬエラーのログ。
    console.error("🚨 コメント取得中に予期せぬエラーが発生しました:", error);
    // その他のエラーの場合、一般的なサーバーエラーを返します。
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  } finally {
    // データベース接続を必ず切断します。
    await prisma.$disconnect();
  }
}

// DELETE ハンドラー: コメントを削除する (将来的な追加の可能性)
// export async function DELETE(req: NextRequest) {
//   // ... コメント削除ロジック
// }

// PUT/PATCH ハンドラー: コメントを更新する (将来的な追加の可能性)
// export async function PATCH(req: NextRequest) {
//   // ... コメント更新ロジック
// }