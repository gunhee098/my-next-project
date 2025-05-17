import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { authenticateUser } from "@/lib/auth";

// 🔥 [GET] 게시글 목록 조회
export async function GET(req: NextRequest) {
  try {
    const client = await pool.connect();
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("search");

    let result;

    if (keyword) {
      result = await client.query(
        `SELECT posts.*, "User".name AS username
         FROM posts
         JOIN "User" ON posts.userid = "User".id
         WHERE posts.title ILIKE $1 OR posts.content ILIKE $1
         ORDER BY posts.created_at DESC`,
        [`%${keyword}%`]
      );
    } else {
      result = await client.query(
        `SELECT posts.*, "User".name AS username
         FROM posts
         JOIN "User" ON posts.userid = "User".id
         ORDER BY posts.created_at DESC`
      );
    }

    client.release();
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("게시글 불러오기 실패:", error);
    return NextResponse.json({ error: "서버 오류 발생!" }, { status: 500 });
  }
}

// 🔥 [POST] 새 게시글 작성
export async function POST(req: NextRequest) {
  try {
    const userId = authenticateUser(req); // 사용자 인증 (토큰 확인)
    console.log("🔍 userId:", userId); // ✅ 디버깅용 로그 추가

    const { title, content } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: "제목과 내용을 입력하세요!" }, { status: 400 });
    }

    const client = await pool.connect();
    await client.query(
      "INSERT INTO posts (userid, title, content, created_at) VALUES ($1, $2, $3, NOW())",
      [userId, title, content]
    );
    client.release();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("글 작성 실패:", error);
    return NextResponse.json({ error: "서버 오류 발생!" }, { status: 500 });
  }
}

// 🔥 [PUT] 게시글 수정
export async function PUT(req: NextRequest) {
  try {
    const userId = authenticateUser(req);
    console.log("🔍 userId:", userId); // ✅ 디버깅용 로그 추가

    const { id, title, content } = await req.json();

    if (!id || !title || !content) {
      return NextResponse.json({ error: "데이터가 부족합니다!" }, { status: 400 });
    }

    const client = await pool.connect();
    const post = await client.query("SELECT userid FROM posts WHERE id = $1", [id]);

    if (post.rows.length === 0) {
      return NextResponse.json({ error: "글을 찾을 수 없습니다!" }, { status: 404 });
    }

    if (post.rows[0].userid !== userId) {
      return NextResponse.json({ error: "본인 글만 수정할 수 있습니다!" }, { status: 403 });
    }

    await client.query(
      "UPDATE posts SET title = $1, content = $2, updated_at = NOW() WHERE id = $3",
      [title, content, id]
    );

    client.release();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("글 수정 실패:", error);
    return NextResponse.json({ error: "서버 오류 발생!" }, { status: 500 });
  }
}

// 🔥 [DELETE] 게시글 삭제
export async function DELETE(req: NextRequest) {
  try {
    const userId = authenticateUser(req);
    console.log("🔍 userId:", userId); // ✅ 디버깅용 로그 추가

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "삭제할 글 ID가 필요합니다!" }, { status: 400 });
    }

    const client = await pool.connect();
    const post = await client.query("SELECT userid FROM posts WHERE id = $1", [id]);

    if (post.rows.length === 0) {
      return NextResponse.json({ error: "글을 찾을 수 없습니다!" }, { status: 404 });
    }

    if (post.rows[0].userid !== userId) {
      return NextResponse.json({ error: "본인 글만 삭제할 수 있습니다!" }, { status: 403 });
    }

    await client.query("DELETE FROM posts WHERE id = $1", [id]);

    client.release();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("글 삭제 실패:", error);
    return NextResponse.json({ error: "서버 오류 발생!" }, { status: 500 });
  }
}