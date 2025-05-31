  import { NextResponse } from "next/server";
  import { verify } from "@/lib/auth";
  import { prisma } from "@/lib/prisma"; // ✅ 정확한 경로로 수정
  export async function POST(req: Request, { params }: { params: { id: string } }) {
    const token = req.headers.get("Authorization")?.split(" ")[1];
    if (!token) return NextResponse.json({ error: "토큰 필요" }, { status: 401 });

    const decoded = verify(token);
    if (!decoded) return NextResponse.json({ error: "토큰 무효" }, { status: 403 });

    const { content } = await req.json();
    if (!content || content.trim() === "") {
      return NextResponse.json({ error: "댓글 내용이 비었습니다" }, { status: 400 });
    }

    try {
      await prisma.comment.create({
        data: {
          content,
          postId: (params.id), // ✅ 여기도 숫자로 바꿔야
          userId: decoded.id,
        },
      });
      return NextResponse.json({ message: "댓글 등록 성공" });
    } catch (err) {
      console.error("❌ 댓글 등록 실패:", err);
      return NextResponse.json({ error: "DB 에러" }, { status: 500 });
    }
  }
  export async function GET(_: Request, { params }: { params: { id: string } }) {
    try {
      console.log("🔍 comments GET id:", params.id);
      const postId = Number(params.id); // 이거 중요!
  
      const comments = await prisma.comment.findMany({
        where: { postId: params.id } , // postId는 number로!
        include: {
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
  
      return NextResponse.json(comments);
    } catch (err) {
      console.error("❌ 댓글 목록 조회 실패:", err);
      return NextResponse.json({ error: "DB 에러" }, { status: 500 });
    }
  }