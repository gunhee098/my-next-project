"use client";

import { useEffect, useState } from "react";

interface Comment {
  id: string;
  content: string;
  user: { name: string };
  createdAt: string;
}

export default function CommentSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    console.log("📡 fetching comments for postId:", postId);
    const res = await fetch(`/api/comments/${postId}`);
    const data = await res.json();
    console.log("📥 data from server:", data); // ✅ 이거 중요
    setComments(data);
    setLoading(false);
  };

  useEffect(() => {
    console.log("🔥 postId in useEffect:", postId);
    fetchComments();
  }, [postId]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    const res = await fetch(`/api/comments/${postId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`, // 💡 토큰 필요
      },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      setContent("");
      fetchComments(); // 등록 후 목록 새로고침
    } else {
      alert("댓글 등록 실패");
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-xl font-bold mb-2">댓글</h3>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글을 입력하세요"
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={handleSubmit}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          등록
        </button>
      </div>

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <ul className="space-y-2">

          {comments.map((comment) => (
            <li key={comment.id} className="border p-2 rounded">
              <p>{comment.content}</p>
              <p className="text-sm text-gray-500">
                작성자: {comment.user.name} · {new Date(comment.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}