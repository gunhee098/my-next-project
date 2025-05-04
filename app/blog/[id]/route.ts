// 📂 app/api/blog/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { authenticateUser } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = authenticateUser(req); // 로그인 사용자 ID 가져오기

    // 게시글 존재 확인
    const postResult = await pool.query('SELECT * FROM "Post" WHERE id = $1', [params.id]);
    const post = postResult.rows[0];

    if (!post) {
      return NextResponse.json({ error: "게시글이 존재하지 않습니다!" }, { status: 404 });
    }

    // 👇 작성자 확인
    if (post.user_id !== userId) {
      return NextResponse.json({ error: "삭제 권한이 없습니다!" }, { status: 403 });
    }

    // 삭제 수행
    await pool.query('DELETE FROM "Post" WHERE id = $1', [params.id]);
    return NextResponse.json({ message: "삭제 성공!" }, { status: 200 });

  } catch (error) {
    console.error("🚨 DELETE 오류:", error);
    return NextResponse.json({ error: "서버 오류 발생!" }, { status: 500 });
  }
}