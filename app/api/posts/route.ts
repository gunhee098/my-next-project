// 📂 app/api/posts/route.ts

import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NextResponse, NextRequest } from 'next/server';

import { authenticateUser } from '@/lib/auth';


const prisma = new PrismaClient();

interface PostResult {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: Date;
  imageUrl: string | null;
  username: string | null;
  _count: {
    // comments: number; // 댓글 기능 주석 처리 유지
    likes: number;
  };
}

// GET 핸들러
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let searchQuery = searchParams.get('search');
    const orderBy = searchParams.get('orderBy') || 'latest';

    // --- ★★★ 여기에 디버깅용 console.log를 추가합니다. ★★★
    console.log("--- 검색어 디버깅 ---");
    console.log("수신된 searchQuery:", searchQuery);
    console.log("searchQuery 타입:", typeof searchQuery);
    if (searchQuery) {
      searchQuery = decodeURIComponent(searchQuery);
    }
    // --- ★★★ 여기까지 추가 ★★★

    const authResult = await authenticateUser(request);
    if (!authResult) {
      console.warn("인증이 필요합니다 (GET /api/posts): 토큰이 유효하지 않거나 존재하지 않습니다.");
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    console.log("--- 게시물 검색 디버그 ---");
    console.log("검색 쿼리 (searchQuery):", searchQuery);
    console.log("정렬 순서 (orderBy):", orderBy);

    let posts: PostResult[];

    if (searchQuery) {
      console.log("Raw Query로 검색을 실행합니다.");

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
        // comments_count: number; // 댓글 기능 주석 처리 유지
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
          -- COALESCE((SELECT COUNT(*) FROM "Comment" WHERE "postId" = p.id), 0)::integer AS comments_count,
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

      posts = rawPosts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        userId: post.userId,
        createdAt: post.createdAt,
        imageUrl: post.imageUrl,
        username: post.username,
        _count: {
          // comments: 0, // 댓글 기능 주석 처리 유지
          likes: post.likes_count,
        },
      }));

    } else {
      console.log("모든 게시물을 가져옵니다.");
      const findManyPosts = await prisma.post.findMany({
        include: {
          user: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              // comments: true, // 댓글 기능 주석 처리 유지
              likes: true,
            },
          },
        },
        orderBy: orderBy === 'latest' ? { createdAt: 'desc' } : { createdAt: 'asc' },
      });

      posts = findManyPosts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        userId: post.userId,
        createdAt: post.createdAt,
        imageUrl: post.imageUrl,
        username: post.user.name,
        _count: {
          // comments: post._count.comments, // 댓글 기능 주석 처리 유지
          likes: post._count.likes,
        },
      }));
    }

    console.log("게시물이 정상적으로 가져와졌습니다. 개수:", posts.length);
    return NextResponse.json(posts);

  } catch (error) {
    console.error("🚨 게시물 가져오는 중 에러 발생:", error);
    if (error instanceof PrismaClientKnownRequestError) {
        return NextResponse.json({ error: `데이터베이스 에러 발생: ${error.message} (Code: ${error.code})` }, { status: 500 });
    }
    if (error instanceof Error) {
        return NextResponse.json({ error: `서버 에러: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "예상치 못한 에러 발생, 게시물 가져오기 실패." }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/posts 핸들러 (새로운 글 작성 기능)
export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateUser(req);
    if (!authResult) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    const { userId } = authResult;

    const { title, content, imageUrl } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: '제목과 내용은 필수입니다.' }, { status: 400 });
    }

    const newPost = await prisma.post.create({
      data: {
        title,
        content,
        imageUrl,
        userId: userId,
      },
    });

    console.log("✔ 새 게시물이 정상적으로 생성되었습니다:", newPost);
    return NextResponse.json(newPost, { status: 201 });

  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
        console.error(`🚨 게시물 생성 중 데이터베이스 에러 발생 [${error.code}]:`, error.message);
        return NextResponse.json({ error: `데이터베이스 에러 발생: ${error.code}` }, { status: 500 });
    }
    console.error("🚨 게시물 생성 중 예상치 못한 에러 발생:", error);
    return NextResponse.json({ error: '서버 에러 발생.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}