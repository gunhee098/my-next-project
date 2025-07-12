// 📂 app/api/comments/route.ts

// Next.js のサーバーサイドAPIルートのためのNextResponseとNextRequestをインポートします。
import { NextResponse, NextRequest } from 'next/server';
// PrismaClient および Prisma 固有のエラータイプをインポートします。
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// ユーザー認証のためのヘルパー関数をインポートします。
import { authenticateUser } from '@/lib/auth';

// PrismaClientのインスタンスを作成します。これによりデータベース操作が可能になります。
const prisma = new PrismaClient();

// POST ハンドラー: 新しいコメントを作成する
export async function POST(req: NextRequest) {
  try {
    // ユーザー認証を行います。
    const authResult = await authenticateUser(req);
    // 認証が失敗した場合の処理。
    if (!authResult) {
      console.warn("コメント作成: 認証が必要です。トークンが無効か存在しません。");
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 }); // 401 Unauthorized レスポンス
    }
    const { userId } = authResult; // 認証されたユーザーIDを取得

    // リクエストボディからコメントの内容と、関連する投稿IDを取得します。
    const { content, postId } = await req.json();

    // 内容または投稿IDが欠けている場合のバリデーション。
    if (!content || !postId) {
      console.warn("コメント作成: 内容または投稿IDが不足しています。");
      return NextResponse.json({ error: 'コメント内容と投稿IDは必須です。' }, { status: 400 }); // 400 Bad Request
    }

    // Prisma を使用して新しいコメントを作成します。
    const newComment = await prisma.comment.create({
      data: {
        content,
        userId,
        postId,
      },
    });

    console.log("✔ 新しいコメントが正常に作成されました:", newComment);
    // 作成されたコメントデータと201 Createdステータスを返します。
    return NextResponse.json(newComment, { status: 201 });

  } catch (error) {
    // PrismaClientKnownRequestError の場合、データベースエラーとしてログを記録し、エラーを返します。
    if (error instanceof PrismaClientKnownRequestError) {
        console.error(`🚨 コメント作成中にデータベースエラーが発生しました [${error.code}]:`, error.message);
        return NextResponse.json({ error: `データベースエラーが発生しました: ${error.code}` }, { status: 500 });
    }
    console.error("🚨 コメント作成中に予期せぬエラーが発生しました:", error); // その他の予期せぬエラーのログ
    // その他のエラーの場合。
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  } finally {
    // データベース接続を必ず切断します。
    await prisma.$disconnect();
  }
}

// GET ハンドラー: 特定の投稿のコメントを取得する
// 例: /api/comments?postId=clxyxyxyx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId'); // 'postId' パラメータの値を取得

    // postId が指定されていない場合の処理。
    if (!postId) {
      console.warn("コメント取得: 投稿IDが不足しています。");
      return NextResponse.json({ error: 'コメントを取得するには投稿IDが必要です。' }, { status: 400 }); // 400 Bad Request
    }

    // ユーザー認証 (コメント取得には認証を必須としない場合もあるが、ここでは安全のため含める)
    // ※コメント取得は通常認証なしでも可能ですが、ここではAPIの一貫性を 위해 포함합니다.
    // ※もし認証不要로 변경하고 싶다면 authResult 관련 로직을 제거하세요.
    const authResult = await authenticateUser(req);
    if (!authResult) {
      console.warn("コメント取得: 認証が必要です。トークンが無効か存在しません。");
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    // 特定の投稿に関連するコメントをPrismaを使用して取得します。
    // コメントを作成したユーザーの情報も一緒に取得します。
    const comments = await prisma.comment.findMany({
      where: {
        postId: postId,
      },
      include: {
        user: { // コメントを作成したユーザーの情報を取得
          select: {
            id: true,
            name: true, // ユーザー名のみ選択
          },
        },
      },
      orderBy: { // コメントを最新順にソート
        createdAt: 'desc',
      },
    });

    console.log(`✔ 投稿ID ${postId} のコメントが正常に取得されました。件数:`, comments.length);
    // 取得したコメントデータをJSON形式で返します。
    return NextResponse.json(comments);

  } catch (error) {
    // エラーハンドリングはPOSTハンドラーと同様です。
    if (error instanceof PrismaClientKnownRequestError) {
        console.error(`🚨 コメント取得中にデータベースエラーが発生しました [${error.code}]:`, error.message);
        return NextResponse.json({ error: `データベースエラーが発生しました: ${error.code}` }, { status: 500 });
    }
    console.error("🚨 コメント取得中に予期せぬエラーが発生しました:", error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  } finally {
    // データベース接続を必ず切断します。
    await prisma.$disconnect();
  }
}

// DELETE ハンドラー: コメントを削除する (향후 추가 가능성)
// export async function DELETE(req: NextRequest) {
//   // ... コメント削除ロジック
// }

// PUT/PATCH ハンドラー: コメントを更新する (향후 추가 가능성)
// export async function PATCH(req: NextRequest) {
//   // ... コメント更新ロジック
// }
