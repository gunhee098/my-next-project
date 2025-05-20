"use client";

import { useState } from "react";
import jwt_decode from "jwt-decode";
export default function PostForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("📌 전송할 데이터:", { title, content, category });

    // ✅ 저장된 토큰 가져오기
    const token = localStorage.getItem("token");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, // ✅ 토큰 포함!
      },
      body: JSON.stringify({
        title,
        content,
        category: category || "기본값",
      }),
    });

    const data = await res.json();
    console.log("📌 서버 응답:", data);

    if (res.ok) {
      alert("게시글이 등록되었습니다!");
      setTitle("");
      setContent("");
      setCategory("");
    } else {
      alert(`에러 발생: ${data.error}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        className="border p-2"
      />
      <textarea
        placeholder="내용"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        className="border p-2"
      />
      <input
        type="text"
        placeholder="카테고리"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="border p-2"
      />
      <button type="submit" className="bg-blue-500 text-white p-2 rounded">
        등록
      </button>
    </form>
  );
}