"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LanguageProvider"; // LanguageProvider import
import en from "@/locales/en.json"; // alias 경로 사용
import ja from "@/locales/ja.json"; // alias 경로 사용

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { lang, setLang } = useLang(); // 언어 상태와 setter 가져오기
  const dict = lang === "ja" ? ja : en; // 현재 언어에 맞는 사전 선택

  const handleCreatePost = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error(dict.needLogin); // 번역된 메시지 사용

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
        throw new Error(errorData.error || dict.postFail); // 번역된 메시지 사용
      }

      setTitle("");
      setContent("");
      router.push("/blog"); // 🔥 작성 후 블로그 목록으로 이동
    } catch (error) {
      console.error(dict.postFail, error); // 번역된 메시지 사용
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 relative"> {/* relative 추가 */}
      {/* 🔤 언어 전환 버튼 - 오른쪽 상단 고정 느낌 */}
      <div className="absolute top-4 right-4"> {/* 위치 조정 */}
        <div className="inline-flex shadow rounded overflow-hidden">
          <button
            onClick={() => setLang("en")}
            className={`px-3 py-1 font-medium ${
              lang === "en" ? "bg-blue-600 text-white" : "bg-gray-200 text-black"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("ja")}
            className={`px-3 py-1 font-medium ${
              lang === "ja" ? "bg-blue-600 text-white" : "bg-gray-200 text-black"
            }`}
          >
            JP
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-4 text-center">{dict.newPostTitle}</h1> {/* 번역 */}

      <input
        type="text"
        placeholder={dict.titlePlaceholder} // 번역
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border p-2 w-full"
      />
      <textarea
        placeholder={dict.contentPlaceholder} // 번역
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="border p-2 w-full mt-2 h-40" // 높이 지정
      />
      <button
        onClick={handleCreatePost}
        className="bg-blue-500 text-white px-4 py-2 mt-2 rounded hover:bg-blue-600"
      >
        {dict.createPost} {/* 번역 */}
      </button>
    </div>
  );
}