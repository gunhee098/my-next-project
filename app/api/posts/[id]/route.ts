import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { authenticateUser } from "@/lib/auth"; // 🔥 로그인 확인 함수 (필수)

// ✨ [1] 게시글 수정 (PUT)

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const id = context.params.id;
  const postId = parseInt(id, 10);

  if (isNaN(postId)) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  try {
    const userId = authenticateUser(req); // 👈 로그인한 사용자 ID 확인

    // 🔍 게시글 정보 먼저 조회
    const postResult = await pool.query("SELECT * FROM posts WHERE id = $1", [postId]);
    if (postResult.rowCount === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const post = postResult.rows[0];
    if (post.userid !== userId) {
      return NextResponse.json({ error: "본인 게시글만 수정할 수 있습니다." }, { status: 403 });
    }

    const { title, content } = await req.json();
    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
    }

    const updateResult = await pool.query(
      "UPDATE posts SET title = $1, content = $2 WHERE id = $3 RETURNING *",
      [title, content, postId]
    );

    return NextResponse.json(updateResult.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// ✨ [2] 게시글 조회 (GET)
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const id = context.params?.id; // ✅ 안전하게 직접 접근

  console.log("🔄 GET 요청 받음 - ID:", id);

  if (!id) {
    return NextResponse.json({ error: "Missing post ID" }, { status: 400 });
  }

  try {
    const result = await pool.query("SELECT * FROM posts WHERE id = $1", [parseInt(id, 10)]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    console.log("✅ 게시글 불러오기 성공:", result.rows[0]);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("🔥 DB 오류:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const id = parseInt(context.params.id, 10);

  console.log("🗑 DELETE 요청 받음 - ID:", id);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  try {
    const userId = authenticateUser(req); // 👈 여기서 오류 나면 인증 실패
    console.log("👤 로그인한 유저 ID:", userId);

    const postResult = await pool.query("SELECT * FROM posts WHERE id = $1", [id]);

    if (postResult.rowCount === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const post = postResult.rows[0];
    console.log("📄 게시글 정보:", post);

    if (post.userid !== userId) {
      console.warn("🚫 다른 사용자의 글을 삭제하려 했습니다!");
      return NextResponse.json({ error: "본인 게시글만 삭제할 수 있습니다." }, { status: 403 });
    }

    const deleteResult = await pool.query("DELETE FROM posts WHERE id = $1 RETURNING *", [id]);

    console.log("✅ 삭제 완료:", deleteResult.rows[0]);
    return NextResponse.json({ message: "Deleted successfully", post: deleteResult.rows[0] });

  } catch (error) {
    console.error("🔥 DELETE 중 오류:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}