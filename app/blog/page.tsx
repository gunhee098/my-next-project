"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { formatDistanceToNow, format } from "date-fns";
import { ko } from "date-fns/locale";

interface Post {
  id: number;
  title: string;
  content: string;
  userid: number;
  created_at: string;
  username: string; // 추가!

}

interface DecodedToken {
  id: number;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

export default function BlogPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const [search, setSearch] = useState("");
  const [userName, setUserName] = useState<string | null>(null);


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        setIsLoggedIn(true);
        setUserId(decoded.id);
        setUserEmail(decoded.email);
        setUserName(decoded.name); // 이름 저장 추가!

      } catch (err) {
        console.error("토큰 디코딩 오류:", err);
      }
    }

    fetchPosts();
  }, []);

  const fetchPosts = async (keyword = "") => {
    try {
      const url = keyword
        ? `/api/posts?search=${encodeURIComponent(keyword)}`
        : `/api/posts`;
  
      const res = await fetch(url, {
        cache: "no-store",
      });
  
      if (!res.ok) throw new Error("서버 응답 실패");
  
      const data: Post[] = await res.json();
      setPosts(data);
    } catch (error) {
      console.error("게시글 불러오기 실패:", error);
    }
  };

  const handleDeletePost = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("로그인이 필요합니다!");

      const res = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "삭제 실패");
      }

      fetchPosts(search); // 삭제 후 검색어 유지
    } catch (error) {
      console.error("삭제 실패:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setUserId(null);
    setUserEmail(null);
    router.push("/");
  };

  const formatCreatedAt = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 1000 * 60 * 60 * 24) {
      return formatDistanceToNow(date, { addSuffix: true, locale: ko });
    }

    return format(date, "yyyy.MM.dd");
  };

  const sortedPosts = [...(posts || [])].sort((a, b) =>
    sortOrder === "latest"
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="flex min-h-screen">
      <aside className="w-48 bg-gray-800 text-white p-4 fixed h-full flex flex-col items-center">
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded w-full text-center"
          >
            로그아웃
          </button>
        )}
      </aside>

      <div className="flex-1 ml-48 p-8">
        <h2 className="text-2xl font-bold text-center mb-6">블로그</h2>

          {isLoggedIn && userEmail && (
            <p className="text-center text-gray-700 mb-4">환영합니다 {userName}님!</p>
        )}

        <div className="flex justify-center mb-4">
          <button
            onClick={() => router.push("/blog/new")}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            새 글 작성
          </button>
        </div>

        {/* 🔍 검색창 */}
       {/* 🔍 검색창 + 전체 글 보기 버튼 */}
<div className="flex justify-center mb-4">
  <input
    type="text"
    placeholder="검색어를 입력하세요"
    className="border rounded px-4 py-2 w-1/2"
    value={search}
    onChange={(e) => {
      const keyword = e.target.value;
      setSearch(keyword);

      // 입력 지우면 자동으로 전체 글 불러오기
      if (keyword === "") {
        fetchPosts(""); 
      }
    }}
  />
  <button
    onClick={() => fetchPosts(search)}
    className="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
  >
    검색
  </button>

  {/* 전체 글 보기 버튼 (검색 중일 때만 보임) */}
  {search && (
    <button
      onClick={() => {
        setSearch("");
        fetchPosts("");
      }}
      className="ml-2 bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
    >
      전체 글 보기
    </button>
  )}
</div>

        {/* 🔥 정렬 버튼 */}
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={() => setSortOrder("latest")}
            className={`px-4 py-2 rounded ${
              sortOrder === "latest" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => setSortOrder("oldest")}
            className={`px-4 py-2 rounded ${
              sortOrder === "oldest" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            오래된 순
          </button>
        </div>

        {/* 🔥 게시글 리스트 */}
        <ul className="mt-6 space-y-4">
          {sortedPosts.map((post) => (
            <li key={post.id} className="border p-4 rounded shadow">
              <h3 className="text-xl font-bold">{post.title}</h3>
              <p className="text-gray-600 mb-2">{post.content}</p>
              <p className="text-sm text-gray-500">
              작성자: {post.username} ・ 작성일: {formatCreatedAt(post.created_at)}
</p>

              {userId === post.userid && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => router.push(`/blog/${post.id}/edit`)}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                  >
                    삭제
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}