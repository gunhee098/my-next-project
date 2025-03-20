"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditPost() {
  const router = useRouter();
  const params = useParams(); // ✅ Next.js에서 안전한 params 가져오기
  const postId = params.id as string; // ✅ id 추출 후 문자열 변환

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    const fetchPost = async () => {
      console.log("🔄 수정할 게시글 불러오는 중...");
      const res = await fetch(`/api/posts/${postId}`);
      if (!res.ok) {
        console.error("⚠ 게시글을 찾을 수 없음");
        router.replace("/blog"); // 없으면 목록으로 이동
        return;
      }
      const data = await res.json();
      setTitle(data.title);
      setContent(data.content);
      console.log("✅ 게시글 불러오기 완료:", data);
    };

    fetchPost();
  }, [postId, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`🔧 수정 요청: ${postId}`);

    const token = localStorage.getItem("token"); // ✅ JWT 토큰 가져오기
    if (!token) {
      alert("로그인이 필요합니다!");
      return;
    }

    const res = await fetch(`/api/posts/${postId}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` // ✅ 🔥 Authorization 헤더 추가
      },
      body: JSON.stringify({ title, content }),
    });

    console.log("서버 응답:", res.status);

    if (res.ok) {
      alert("수정 완료!");
      router.push(`/blog`);
    } else {
      alert("수정 실패");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold">게시글 수정</h1>
      <form onSubmit={handleUpdate} className="mt-4 space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2 rounded"
          placeholder="제목"
          required
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full border p-2 rounded"
          placeholder="내용"
          required
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          수정 완료
        </button>
      </form>
    </div>
  );
}