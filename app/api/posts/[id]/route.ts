// 📂 app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"; // Next.jsのAPIルートのためのモジュール
import { prisma } from "@/lib/prisma"; // ✅ Prismaクライアントをインポートします。
import { authenticateUser } from "@/lib/auth"; // ユーザー認証関数をインポートします。
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'; // Prismaエラータイプをインポートします。

/**
 * [PUT] 投稿の更新
 * 特定のIDを持つ投稿を更新します。認証されたユーザーが自身の投稿のみを更新できます。
 * @param req NextRequest オブジェクト
 * @param context URLパラメータを含むコンテキストオブジェクト
 * @returns NextResponse オブジェクト (成功時は更新された投稿データ, 失敗時はエラーメッセージ)
 */
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const postId = context.params.id; // URLパラメータから投稿IDを取得 (string型)

  // 投稿IDのバリデーション
  if (!postId) {
    return NextResponse.json({ error: "無効な投稿IDです。" }, { status: 400 });
  }

  try {
    // ユーザー認証
    const authResult = await authenticateUser(req);
    if (!authResult) {
        return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }
    const { userId } = authResult; // 認証されたユーザーのIDを取得 (string型)

    // トランザクションを開始し、投稿の存在確認、所有者チェック、更新をまとめて行います。
    const updatedPost = await prisma.$transaction(async (prismaTx) => {
        // 投稿の存在確認と所有者チェック
        const post = await prismaTx.post.findUnique({
            where: { id: postId },
            select: { userId: true }, // userIdのみを選択してパフォーマンスを向上
        });

        if (!post) {
            throw new Error("投稿が見つかりませんでした。__404"); // カスタムエラーでステータスを伝達
        }
        // ここでの post.userId は string 型です (PrismaでUUIDを使用しているため)
        if (post.userId !== userId) {
            throw new Error("ご自身の投稿のみ更新できます。__403"); // カスタムエラーでステータスを伝達
        }

        // リクエストボディからタイトル、内容、画像URLを取得
        const { title, content, imageUrl } = await req.json(); // image_url -> imageUrl に修正

        // タイトルと内容は必須項目のバリデーション (imageUrlはオプション)
        if (!title || !content) {
            throw new Error("タイトルと内容は必須です。__400"); // カスタムエラーでステータスを伝達
        }

        // 投稿データをデータベースで更新
        // imageUrlがnullで送信された場合、DBのimageUrlもnullになります。
        const result = await prismaTx.post.update({
            where: { id: postId },
            data: {
                title,
                content,
                imageUrl, // imageUrlを使用
                updatedAt: new Date(), // 現在の日時に更新
            },
        });
        return result;
    });

    return NextResponse.json(updatedPost, { status: 200 });

  } catch (error) {
    console.error("投稿の更新中にエラーが発生しました:", error);
    if (error instanceof PrismaClientKnownRequestError) {
        return NextResponse.json({ error: `データベースエラーが発生しました: ${error.code}` }, { status: 500 });
    } else if (error instanceof Error) {
        // カスタムエラーメッセージとステータスコードを処理
        if (error.message.includes("__404")) {
            return NextResponse.json({ error: error.message.replace("__404", "") }, { status: 404 });
        }
        if (error.message.includes("__403")) {
            return NextResponse.json({ error: error.message.replace("__403", "") }, { status: 403 });
        }
        if (error.message.includes("__400")) {
            return NextResponse.json({ error: error.message.replace("__400", "") }, { status: 400 });
        }
    }
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}

/**
 * [GET] 投稿の取得
 * 特定のIDを持つ単一の投稿を取得します。
 * @param req NextRequest オブジェクト
 * @param context URLパラメータを含むコンテキストオブジェクト
 * @returns NextResponse オブジェクト (成功時は投稿データ, 失敗時はエラーメッセージ)
 */
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const postId = context.params.id; // URLパラメータから投稿IDを取得 (string型)

  console.log("リクエスト受信 - GET ID:", postId); // リクエスト受信ログ

  // 投稿IDのバリデーション
  if (!postId) {
    return NextResponse.json({ error: "無効な投稿IDです。" }, { status: 400 });
  }

  try {
    // Prismaを使用して投稿情報を取得 (ユーザー情報を結合)
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { // ユーザー情報を取得
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: { // コメントといいねの数を取得
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    // 投稿が見つからない場合
    if (!post) {
      return NextResponse.json({ error: "投稿が見つかりませんでした。" }, { status: 404 });
    }

    // ユーザー名が直接 `username` として返されるように整形
    const formattedPost = {
      ...post,
      username: post.user.name,
      // post.user オブジェクト全体は不要なので削除するか、明示的に含めない
      user: undefined, // userオブジェクトは削除
    };

    console.log("投稿の読み込みに成功しました:", formattedPost); // 成功ログ
    return NextResponse.json(formattedPost, { status: 200 });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      console.error(`🚨 投稿取得中にデータベースエラーが発生しました [${error.code}]:`, error.message);
      return NextResponse.json({ error: `データベースエラーが発生しました: ${error.code}` }, { status: 500 });
    }
    console.error("🚨 データベースエラー:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}

/**
 * [DELETE] 投稿の削除
 * 特定のIDを持つ投稿を削除します。認証されたユーザーが自身の投稿のみを削除できます。
 * @param req NextRequest オブジェクト
 * @param context URLパラメータを含むコンテキストオブジェクト
 * @returns NextResponse オブジェクト (成功時は削除メッセージ, 失敗時はエラーメッセージ)
 */
export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const postId = context.params.id; // URLパラメータから投稿IDを取得 (string型)

  console.log("リクエスト受信 - DELETE ID:", postId); // リクエスト受信ログ

  // 投稿IDのバリデーション
  if (!postId) {
    return NextResponse.json({ error: "無効な投稿IDです。" }, { status: 400 });
  }

  try {
    // ユーザー認証
    const authResult = await authenticateUser(req);
    if (!authResult) {
        return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }
    const { userId } = authResult; // 認証されたユーザーのIDを取得 (string型)
    console.log("ログインユーザーID:", userId); // ログインユーザーIDログ

    // トランザクションを開始し、投稿の存在確認、所有者チェック、削除をまとめて行います。
    const deletedPost = await prisma.$transaction(async (prismaTx) => {
        // 投稿の存在確認と所有者チェック
        const post = await prismaTx.post.findUnique({
            where: { id: postId },
            select: { userId: true }, // userIdのみを選択してパフォーマンスを向上
        });

        if (!post) {
            throw new Error("投稿が見つかりませんでした。__404"); // カスタムエラーでステータスを伝達
        }
        // ここでの post.userId は string 型です (PrismaでUUIDを使用しているため)
        if (post.userId !== userId) {
            throw new Error("ご自身の投稿のみ削除できます。__403"); // カスタムエラーでステータスを伝達
        }

        // データベースから投稿を削除
        const result = await prismaTx.post.delete({
            where: { id: postId },
        });
        return result;
    });

    console.log("削除が完了しました:", deletedPost); // 削除完了ログ
    return NextResponse.json({ message: "正常に削除されました。", post: deletedPost }, { status: 200 });

  } catch (error) {
    console.error("DELETE中にエラーが発生しました:", error);
    if (error instanceof PrismaClientKnownRequestError) {
        return NextResponse.json({ error: `データベースエラーが発生しました: ${error.code}` }, { status: 500 });
    } else if (error instanceof Error) {
        // カスタムエラーメッセージとステータスコードを処理
        if (error.message.includes("__404")) {
            return NextResponse.json({ error: error.message.replace("__404", "") }, { status: 404 });
        }
        if (error.message.includes("__403")) {
            return NextResponse.json({ error: error.message.replace("__403", "") }, { status: 403 });
        }
    }
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}