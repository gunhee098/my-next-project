// 📂 app/api/posts/route.ts

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NextResponse, NextRequest } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

interface PostResult {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: Date;
  imageUrl: string | null;
  username: string | null;
  _count: {
    likes: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let searchQuery = searchParams.get('search');
    const orderBy = searchParams.get('orderBy') || 'latest';

    console.log("--- 検索クエリ デバッグ ---");
    console.log("受信した searchQuery:", searchQuery);
    console.log("searchQuery タイプ:", typeof searchQuery);
    
    if (searchQuery) {
      searchQuery = decodeURIComponent(searchQuery);
    }

    const authResult = await authenticateUser(request);
    if (!authResult) {
      console.warn("認証が必要です (GET /api/posts): トークンが無効か存在しません。");
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    console.log("--- 投稿検索デバッグ ---");
    console.log("検索クエリ (searchQuery):", searchQuery);
    console.log("ソート順 (orderBy):", orderBy);

    let posts: PostResult[];

    if (searchQuery) {
      console.log("Raw クエリで検索を実行します。");

      let orderBySql = '';
      if (orderBy === 'latest') {
        orderBySql = 'p."created_at" DESC';
      } else if (orderBy === 'oldest') {
        orderBySql = 'p."created_at" ASC';
      } else {
        orderBySql = 'p."created_at" DESC';
      }

      const searchTerm = `%${searchQuery}%`;

      interface RawPostQueryResult {
        id: string;
        title: string;
        content: string;
        userId: string;
        createdAt: Date;
        imageUrl: string | null;
        username: string | null;
        likes_count: number;
      }

      const rawPosts = await prisma.$queryRaw<RawPostQueryResult[]>`
        SELECT
          p.id,
          p.title,
          p.content,
          p."userId",
          p."created_at" AS "createdAt",
          p.image_url AS "imageUrl",
          COALESCE(u.name, 'Anonymous') AS username,
          COALESCE((SELECT COUNT(*) FROM "like" WHERE "postId" = p.id), 0)::integer AS likes_count
        FROM
          "post" p
        JOIN
          "user" u ON p."userId" = u.id
        WHERE
          p.title ILIKE ${searchTerm} COLLATE "C"
          OR p.content ILIKE ${searchTerm} COLLATE "C"
        ORDER BY
          ${Prisma.raw(orderBySql)};
      `;

      posts = rawPosts.map((post: RawPostQueryResult) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        userId: post.userId,
        createdAt: post.createdAt,
        imageUrl: post.imageUrl,
        username: post.username,
        _count: {
          likes: post.likes_count,
        },
      }));

    } else {
      console.log("すべての投稿を取得します。");
      
      const findManyPosts = await prisma.post.findMany({
        include: {
          user: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
        },
        orderBy: orderBy === 'latest' ? { createdAt: 'desc' } : { createdAt: 'asc' },
      });

      posts = findManyPosts.map((post: any) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        userId: post.userId,
        createdAt: post.createdAt,
        imageUrl: post.imageUrl,
        username: post.user.name,
        _count: {
          likes: post._count.likes,
        },
      }));
    }

    console.log("投稿が正常に取得されました。件数:", posts.length);
    return NextResponse.json(posts);

  } catch (error: unknown) {
    console.error("🚨 投稿取得中にエラーが発生しました:", error);
    
    if (error instanceof PrismaClientKnownRequestError) {
        return NextResponse.json({ error: `データベースエラーが発生しました: ${error.message} (コード: ${error.code})` }, { status: 500 });
    }
    
    if (error instanceof Error) {
        return NextResponse.json({ error: `サーバーエラー: ${error.message}` }, { status: 500 });
    }
    
    return NextResponse.json({ error: "予期せぬエラーが発生しました、投稿の取得に失敗しました。" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateUser(req);
    if (!authResult) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }
    const { userId } = authResult;

    const { title, content, image_url } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'タイトルと内容は必須です。' }, { status: 400 });
    }

    const newPost = await prisma.post.create({
      data: {
        title,
        content,
        imageUrl: image_url,
        userId: userId,
      },
    });

    console.log("✔ 新しい投稿が正常に作成されました:", newPost);
    return NextResponse.json(newPost, { status: 201 });

  } catch (error: unknown) {
    if (error instanceof PrismaClientKnownRequestError) {
        console.error(`🚨 投稿作成中にデータベースエラーが発生しました [${error.code}]:`, error.message);
        return NextResponse.json({ error: `データベースエラーが発生しました: ${error.code}` }, { status: 500 });
    }
    console.error("🚨 投稿作成中に予期せぬエラーが発生しました:", error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}