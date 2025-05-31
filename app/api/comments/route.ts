  // import { authenticateUser } from "@/lib/auth";
  // import pool from "@/lib/db";
  // import { NextRequest, NextResponse } from "next/server";

  // export async function POST(req: NextRequest) {
  //   try {
  //     const userId = authenticateUser(req); // 💡 사용자 인증
  //     const body = await req.json();
  //     const { postId, content } = body;

  //     if (!postId || !content) {
  //       return NextResponse.json({ error: "모든 필드를 입력하세요." }, { status: 400 });
  //     }

  //     await pool.query(
  //       `INSERT INTO comments (postid, userid, content) VALUES ($1, $2, $3)`,
  //       [postId, userId, content]
  //     );

  //     return NextResponse.json({ message: "댓글이 등록되었습니다." });
  //   } catch (err) {
  //     console.error("❌ 댓글 작성 실패:", err);
  //     return NextResponse.json({ error: "댓글 작성 중 에러 발생" }, { status: 500 });
  //   }
  // }
  // // app/api/comments/route.ts
  // export async function GET(req: Request) {
  //   const { searchParams } = new URL(req.url);
  //   const postId = searchParams.get("id");

  //   if (!postId) {
  //     return NextResponse.json({ error: "postId가 필요합니다!" }, { status: 400 });
  //   }

  //   try {
  //     const result = await pool.query(
  //       `SELECT id, content, created_at, userid FROM comments WHERE postid = $1 ORDER BY created_at DESC`,
  //       [postId]
  //     );

  //     return NextResponse.json({ comments: result.rows });
  //   } catch (error) {
  //     console.error("댓글 가져오기 실패:", error);
  //     return NextResponse.json({ error: "서버 에러" }, { status: 500 });
  //   }
  // }