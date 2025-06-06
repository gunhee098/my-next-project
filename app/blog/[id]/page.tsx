"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PostPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [post, setPost] = useState<{id:number; title: string; content: string } | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      const res = await fetch(`/api/posts/${params.id}`);
      if (!res.ok) {
        router.replace("/"); // 게시글 없으면 목록으로 이동
        return;
      }
      setPost(await res.json());
    };

    fetchPost();
  }, [params.id, router]);

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/posts/${params.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      alert("삭제되었습니다.");
      router.push("/"); // 삭제 후 게시판 목록으로 이동
    } else {
      alert("삭제 실패");
    }
  };

  if (!post) return <p>게시글을 불러오는 중...</p>;
  console.log("✅ post:", post); // 이거 추가

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <p className="text-gray-600 mt-2">{post.content}</p>
      
  

  

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => router.push(`/blog/edit/${params.id}`)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          수정
        </button>
        <button
          onClick={handleDelete}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          삭제
        </button>
      </div>
    </div>
  );
}