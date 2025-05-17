"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleCreatePost = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("로그인이 필요합니다!");

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "글 작성 실패");
      }

      setTitle("");
      setContent("");
      router.push("/blog"); // 🔥 작성 후 블로그 목록으로 이동
    } catch (error) {
      console.error("글 작성 실패:", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">새 포스트 작성</h1>

      <input
        type="text"
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border p-2 w-full"
      />
      <textarea
        placeholder="내용"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="border p-2 w-full mt-2"
      />
      <button
        onClick={handleCreatePost}
        className="bg-blue-500 text-white px-4 py-2 mt-2 rounded"
      >
        글 작성
      </button>
    </div>
  );
}