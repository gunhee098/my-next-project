// 📂 app/api/likes/status/route.ts (수정할 부분)

import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get('postId');
    const userId = url.searchParams.get('userId'); // 클라이언트가 보낸 userId (쿼리 파라미터)

    // 쿼리 파라미터 로그 추가
    console.log(`[LikesStatus API] Received postId: ${postId}, userId from Query: ${userId}`);

    if (!postId || !userId) {
      return NextResponse.json({ message: 'Missing postId or userId query parameter' }, { status: 400 });
    }

    const authenticatedUser = await authenticateUser(request); // 서버가 토큰에서 인증한 사용자 정보

    // --- 여기서부터 디버깅 로그를 추가합니다. ---
    console.log(`[LikesStatus API] AuthenticateUser result:`, authenticatedUser); // authenticateUser 결과 전체 로그
    if (!authenticatedUser) {
      console.warn(`[LikesStatus API] Authentication failed: No authenticated user. Returning 401.`);
      return NextResponse.json({ message: '認証が必要です。' }, { status: 401 });
    }

    console.log(`[LikesStatus API] Authenticated User ID from Token: ${authenticatedUser.userId}`); // 토큰에서 추출된 ID
    console.log(`[LikesStatus API] User ID from Query Parameter: ${userId}`); // 클라이언트에서 보낸 ID

    if (authenticatedUser.userId !== userId) {
      console.warn(`[LikesStatus API] Forbidden: Mismatched user IDs. Returning 403.`);
      return NextResponse.json({ message: '認証情報が一致しません。' }, { status: 403 });
    }
    // ------------------------------------

    const like = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: authenticatedUser.userId,
          postId: postId,
        },
      },
    });

    return NextResponse.json({ isLiked: !!like });

  } catch (error) {
    console.error('いいね状態の取得エラー:', error);
    return NextResponse.json({ message: 'いいね状態の取得に失敗しました。' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}