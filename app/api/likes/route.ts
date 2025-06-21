// app/api/likes/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db"; // データベース接続プールをインポート
import jwt from "jsonwebtoken"; // 💡 JWT를 임포트 (middleware.ts와 같은 secret 사용 확인용)

function getAuthenticatedUser(req: NextRequest) {
  // 💡 API Route에서 직접 JWT를 검증하여 user 정보를 가져오도록 수정 (미들웨어 이슈 우회)
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  console.log("--- Likes API Debugging ---");
  console.log("Likes API: Received Authorization Header:", authHeader);
  console.log("Likes API: Extracted Token:", token ? token.substring(0, 10) + '...' : "No token");

  if (!token) {
    console.warn("Likes API: トークンがlikes APIに到達しませんでした。");
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret"); // 💡 JWT_SECRET 사용
    console.log("Likes API: JWT Verified. Decoded User ID:", (decoded as any).id); // 고객님의 decoded.id에 맞춤
    return decoded as { id: number; email: string; name: string }; // 고객님의 DecodedToken 인터페이스에 맞게 타입 지정
  } catch (error) {
    console.error("Likes API: JWT verification failed:", (error as Error).message);
    return null;
  }
}

// ⚡ [POST] 좋아요 추가/取消 (Toggle Like)
export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    // 1. 인증된 사용자 정보 가져오기 - 💡 이제 getAuthenticatedUser 함수가 직접 JWT를 검증
    const user = getAuthenticatedUser(req);
    if (!user || !user.id) { // 💡 user.userId 대신 user.id 사용
      console.error("Likes API: ユーザー情報が認証できませんでした。");
      return NextResponse.json({ error: "認証が必要です！" }, { status: 401 }); // 認証エラー
    }
    const userId = user.id; // 로그인된 사용자의 ID

    // 2. 요청 본문에서 postId 가져오기
    const { postId } = await req.json();
    if (!postId) {
      console.error("Likes API: postIdがリクエストボディにありません。");
      return NextResponse.json({ error: "postIdは必須です！" }, { status: 400 }); // Bad Request
    }

    // 3. トランザクション開始 (좋아요 추가/삭제 및 오류 처리)
    await client.query('BEGIN'); // 트랜잭션 시작

    // 4. 해당 게시글에 대한 사용자의 좋아요 상태 확인
    const existingLike = await client.query(
      `SELECT id FROM likes WHERE post_id = $1 AND user_id = $2`,
      [postId, userId]
    );

    let message = "";
    let newLikeStatus = false; // 새로운 좋아요 상태 (true: 좋아요 눌림, false: 좋아요 취소)

    if (existingLike.rows.length > 0) {
      // 5. 이미 좋아요가 있으면 삭제 (좋아요 취소)
      await client.query(
        `DELETE FROM likes WHERE post_id = $1 AND user_id = $2`,
        [postId, userId]
      );
      message = "いいねを取り消しました！"; // 좋아요 취소 완료
      newLikeStatus = false;
    } else {
      // 6. 좋아요가 없으면 추가
      await client.query(
        `INSERT INTO likes (post_id, user_id) VALUES ($1, $2)`,
        [postId, userId]
      );
      message = "いいねしました！"; // 좋아요 완료
      newLikeStatus = true;
    }

    await client.query('COMMIT'); // 트랜잭션 커밋

    console.log(`Likes API: ${message} - Post ID: ${postId}, User ID: ${userId}`);
    return NextResponse.json({ message, newLikeStatus }, { status: 200 });

  } catch (error) {
    await client.query('ROLLBACK'); // エラー発生時トランザクションロールバック
    console.error("Likes API: エラーが発生しました:", error);
    // エラーがUNIQUE制約違反ならば (非常に稀だが、同時実行性の問題で発生する可能性あり)
    if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint "likes_post_id_user_id_key"')) {
        return NextResponse.json({ error: "すでにいいね済みです！" }, { status: 409 }); // Conflict
    }
    return NextResponse.json({ error: "サーバーエラーが発生しました！" }, { status: 500 });
  } finally {
    client.release(); // クライアントを接続プールに返す
  }
}