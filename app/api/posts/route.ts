// 📂 app/api/posts/route.ts

// PrismaClient および Prisma タイプをインポートします。
import { PrismaClient, Prisma } from '@prisma/client';
// PrismaClientKnownRequestError は、Prisma 固有のエラーを処理するために使用されます。
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
// Next.js のサーバーサイドAPIルートのためのNextResponseとNextRequestをインポートします。
import { NextResponse, NextRequest } from 'next/server';

// ユーザー認証のためのヘルパー関数をインポートします。
import { authenticateUser } from '@/lib/auth';

// PrismaClientのインスタンスを作成します。これによりデータベース操作が可能になります。
const prisma = new PrismaClient();

// 投稿結果のデータ構造を定義するインターフェースです。
interface PostResult {
  id: string; // 投稿の一意識別子
  title: string; // 投稿のタイトル
  content: string; // 投稿の内容
  userId: string; // 投稿を作成したユーザーのID
  createdAt: Date; // 投稿作成日時
  imageUrl: string | null; // 投稿に関連付けられた画像のURL（オプション）
  username: string | null; // 投稿を作成したユーザーの名前
  _count: { // 関連するレコードの数を格納するオブジェクト
    // comments: number; // コメント機能は現在コメントアウトされています。
    likes: number; // 投稿へのいいねの数
  };
}

// GET ハンドラー: 投稿の取得（検索機能付き）
export async function GET(request: NextRequest) {
  try {
    // リクエストURLから検索パラメータを取得します。
    const { searchParams } = new URL(request.url);
    let searchQuery = searchParams.get('search'); // 'search' パラメータの値を取得
    const orderBy = searchParams.get('orderBy') || 'latest'; // 'orderBy' パラメータの値を取得、デフォルトは 'latest'

    // --- ここにデバッグ用 console.log を追加します。 ---
    console.log("--- 検索クエリ デバッグ ---"); // 検索クエリのデバッグ開始を示すログ
    console.log("受信した searchQuery:", searchQuery); // 受信した検索クエリの値をログに出力
    console.log("searchQuery タイプ:", typeof searchQuery); // searchQuery のデータ型をログに出力
    // searchQuery が存在する場合、URLエンコードされた文字列をデコードします。
    if (searchQuery) {
      searchQuery = decodeURIComponent(searchQuery);
    }
    // --- ここまで追加 ---

    // ユーザー認証を行います。
    const authResult = await authenticateUser(request);
    // 認証が失敗した場合の処理。
    if (!authResult) {
      console.warn("認証が必要です (GET /api/posts): トークンが無効か存在しません。"); // 認証失敗の警告ログ
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 }); // 401 Unauthorized レスポンス
    }

    console.log("--- 投稿検索デバッグ ---"); // 投稿検索のデバッグ開始を示すログ
    console.log("検索クエリ (searchQuery):", searchQuery); // 検索クエリの値をログに出力
    console.log("ソート順 (orderBy):", orderBy); // ソート順をログに出力

    let posts: PostResult[]; // 取得した投稿を格納する配列

    // 検索クエリがある場合の処理。
    if (searchQuery) {
      console.log("Raw クエリで検索を実行します。"); // Rawクエリでの検索実行を示すログ

      let orderBySql = '';
      // ソート順に基づいてSQLのORDER BY句を構築します。
      if (orderBy === 'latest') {
        orderBySql = 'p."created_at" DESC'; // 最新順（降順）
      } else if (orderBy === 'oldest') {
        orderBySql = 'p."created_at" ASC'; // 最古順（昇順）
      } else {
        orderBySql = 'p."created_at" DESC'; // デフォルトは最新順
      }

      // 検索語句をSQLのLIKE句で使用できるように準備します。
      const searchTerm = `%${searchQuery}%`;

      // Rawクエリの結果の型を定義するインターフェースです。
      interface RawPostQueryResult {
        id: string;
        title: string;
        content: string;
        userId: string;
        createdAt: Date;
        imageUrl: string | null;
        username: string | null;
        // comments_count: number; // コメント機能は現在コメントアウトされています。
        likes_count: number; // いいねの数
      }

      // Prismaの$queryRawを使用して、生のSQLクエリを実行し投稿を検索します。
      const rawPosts = await prisma.$queryRaw<RawPostQueryResult[]>`
        SELECT
          p.id,
          p.title,
          p.content,
          p."userId",
          p."created_at" AS "createdAt",
          p.image_url AS "imageUrl",
          COALESCE(u.name, 'Anonymous') AS username, -- ユーザー名がない場合は 'Anonymous'
          -- COALESCE((SELECT COUNT(*) FROM "Comment" WHERE "postId" = p.id), 0)::integer AS comments_count, // コメント数取得（コメントアウト）
          COALESCE((SELECT COUNT(*) FROM "like" WHERE "postId" = p.id), 0)::integer AS likes_count -- いいね数取得
        FROM
          "post" p
        JOIN
          "user" u ON p."userId" = u.id -- ユーザーテーブルと結合
        WHERE
          p.title ILIKE ${searchTerm} COLLATE "C" -- タイトルで大文字小文字を区別しない検索
          OR p.content ILIKE ${searchTerm} COLLATE "C" -- 内容で大文字小文字を区別しない検索
        ORDER BY
          ${Prisma.raw(orderBySql)}; -- ソート順を適用
      `;

      // Rawクエリの結果をPostResultインターフェースの形式にマッピングします。
      posts = rawPosts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        userId: post.userId,
        createdAt: post.createdAt,
        imageUrl: post.imageUrl,
        username: post.username,
        _count: {
          // comments: 0, // コメント機能は現在コメントアウトされています。
          likes: post.likes_count,
        },
      }));

    } else {
      console.log("すべての投稿を取得します。"); // 全ての投稿を取得することを示すログ
      // 検索クエリがない場合、すべての投稿をPrismaのfindManyメソッドで取得します。
      const findManyPosts = await prisma.post.findMany({
        include: { // 関連するリレーションを含めて取得
          user: { // ユーザー情報を含める
            select: {
              name: true, // ユーザー名のみ選択
            },
          },
          _count: { // 関連するレコードの数をカウント
            select: {
              // comments: true, // コメント数（コメントアウト）
              likes: true, // いいねの数
            },
          },
        },
        // ソート順を適用
        orderBy: orderBy === 'latest' ? { createdAt: 'desc' } : { createdAt: 'asc' },
      });

      // 取得した投稿をPostResultインターフェースの形式にマッピングします。
      posts = findManyPosts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        userId: post.userId,
        createdAt: post.createdAt,
        imageUrl: post.imageUrl,
        username: post.user.name,
        _count: {
          // comments: post._count.comments, // コメント数（コメントアウト）
          likes: post._count.likes,
        },
      }));
    }

    console.log("投稿が正常に取得されました。件数:", posts.length); // 投稿取得成功と件数をログに出力
    // 取得した投稿データをJSON形式で返します。
    return NextResponse.json(posts);

  } catch (error) {
    console.error("🚨 投稿取得中にエラーが発生しました:", error); // 投稿取得エラーのログ
    // PrismaClientKnownRequestError の場合、詳細なエラーメッセージを返します。
    if (error instanceof PrismaClientKnownRequestError) {
        return NextResponse.json({ error: `データベースエラーが発生しました: ${error.message} (コード: ${error.code})` }, { status: 500 }); // 500 Internal Server Error
    }
    // その他の一般的なエラーの場合。
    if (error instanceof Error) {
        return NextResponse.json({ error: `サーバーエラー: ${error.message}` }, { status: 500 }); // 500 Internal Server Error
    }
    // 予期せぬエラーの場合。
    return NextResponse.json({ error: "予期せぬエラーが発生しました、投稿の取得に失敗しました。" }, { status: 500 }); // 500 Internal Server Error
  } finally {
    // データベース接続を必ず切断します。
    await prisma.$disconnect();
  }
}

// POST /api/posts ハンドラー (新しい投稿作成機能)
export async function POST(req: NextRequest) {
  try {
    // ユーザー認証を行います。
    const authResult = await authenticateUser(req);
    // 認証が失敗した場合の処理。
    if (!authResult) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 }); // 401 Unauthorized レスポンス
    }
    const { userId } = authResult; // 認証されたユーザーIDを取得

    // リクエストボディからタイトル、内容、画像URLを取得します。
    const { title, content, imageUrl } = await req.json();

    // タイトルまたは内容が欠けている場合のバリデーション。
    if (!title || !content) {
      return NextResponse.json({ error: 'タイトルと内容は必須です。' }, { status: 400 }); // 400 Bad Request
    }

    // Prisma を使用して新しい投稿を作成します。
    const newPost = await prisma.post.create({
      data: {
        title, // 投稿タイトル
        content, // 投稿内容
        imageUrl, // 画像URL（オプション）
        userId: userId, // ユーザーID
      },
    });

    console.log("✔ 新しい投稿が正常に作成されました:", newPost); // 新しい投稿作成成功のログ
    // 作成された投稿データと201 Createdステータスを返します。
    return NextResponse.json(newPost, { status: 201 });

  } catch (error) {
    // PrismaClientKnownRequestError の場合、データベースエラーとしてログを記録し、エラーを返します。
    if (error instanceof PrismaClientKnownRequestError) {
        console.error(`🚨 投稿作成中にデータベースエラーが発生しました [${error.code}]:`, error.message);
        return NextResponse.json({ error: `データベースエラーが発生しました: ${error.code}` }, { status: 500 });
    }
    console.error("🚨 投稿作成中に予期せぬエラーが発生しました:", error); // その他の予期せぬエラーのログ
    // その他のエラーの場合。
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  } finally {
    // データベース接続を必ず切断します。
    await prisma.$disconnect();
  }
}