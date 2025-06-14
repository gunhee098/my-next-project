// 📂 app/blog/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { formatDistanceToNow, format } from "date-fns";
import { ko } from "date-fns/locale";
import { useLang } from "@/components/LanguageProvider";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";


interface Post {
  id: number;
  title: string;
  content: string;
  userid: number;
  created_at: string;
  username: string;
  image_url?: string;
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
  const { lang, setLang } = useLang();
  const dict = lang === "ja" ? ja : en;

  // fetchPosts 함수를 useCallback으로 래핑하고, router를 의존성 배열에 추가
  const fetchPosts = useCallback(async (keyword = "") => {
    try {
      const queryParams = new URLSearchParams();
      if (keyword) {
        queryParams.append("search", encodeURIComponent(keyword));
      }
      if (sortOrder) {
        queryParams.append("orderBy", sortOrder);
      }

      const url = `/api/posts?${queryParams.toString()}`;

      // 인증 토큰을 Authorization 헤더에 포함
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        cache: "no-store",
        headers: headers // Authorization 헤더 추가
      });

      // 💡 추가/수정: API 응답이 401(Unauthorized) 또는 403(Forbidden)일 경우 로그인 페이지로 리다이렉트
      if (res.status === 401 || res.status === 403) {
        console.error("API 인증 실패: 토큰이 없거나 유효하지 않습니다.");
        localStorage.removeItem("token"); // 유효하지 않은 토큰 삭제
        setIsLoggedIn(false);
        setUserId(null);
        setUserEmail(null);
        setUserName(null);
        router.push("/"); // 로그인 페이지로 리다이렉트
        return; // 추가 처리 없이 함수 종료
      }

      if (!res.ok) throw new Error("서버 응답 실패");

      const data: Post[] = await res.json();
      setPosts(data);
    } catch (error) {
      console.error("게시글 불러오기 실패:", error);
    }
  }, [sortOrder, router]); // 💡 router를 의존성 배열에 추가

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000; // 현재 시간을 초 단위로

        // 💡 추가: 토큰 만료 시간 확인
        if (decoded.exp < currentTime) {
          console.warn("토큰이 만료되었습니다. 로그아웃 처리합니다.");
          localStorage.removeItem("token");
          setIsLoggedIn(false);
          setUserId(null);
          setUserEmail(null);
          setUserName(null);
          router.push("/"); // 💡 추가: 로그인 페이지로 리다이렉트
          return; // 추가 처리 없이 함수 종료
        }

        setIsLoggedIn(true);
        setUserId(decoded.id);
        setUserEmail(decoded.email);
        setUserName(decoded.name);
      } catch (err) {
        console.error("토큰 디코딩 오류:", err);
        setIsLoggedIn(false);
        setUserId(null);
        setUserEmail(null);
        setUserName(null);
        router.push("/"); // 💡 추가: 토큰 오류 시 로그인 페이지로 리다이렉트
        return; // 추가 처리 없이 함수 종료
      }
    } else {
      // 💡 추가: 토큰이 없는 경우에도 로그인 페이지로 리다이렉트
      setIsLoggedIn(false);
      setUserId(null);
      setUserEmail(null);
      setUserName(null);
      router.push("/"); // 💡 추가: 로그인 페이지로 리다이렉트
      return; // 추가 처리 없이 함수 종료
    }

    fetchPosts(search);
  }, [fetchPosts, search, router]); // 💡 router를 의존성 배열에 추가

  const handleDeletePost = async (id: number) => {
    if (!confirm(dict.confirmDelete)) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        // 💡 추가: 토큰이 없는 경우 로그인 페이지로 리다이렉트 (useEffect에서도 처리되지만 예방 차원)
        router.push("/");
        return;
      }

      const res = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        // 💡 추가: 삭제 API가 인증 실패를 반환한 경우 리다이렉트
        if (res.status === 401 || res.status === 403) {
          console.error("삭제 API 인증 실패: 토큰이 없거나 유효하지 않습니다.");
          localStorage.removeItem("token");
          router.push("/");
          return;
        }
        const errorData = await res.json();
        throw new Error(errorData.error || dict.deleteFail);
      }

      fetchPosts(search);
    } catch (error) {
      console.error("삭제 실패:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setUserId(null);
    setUserEmail(null);
    setUserName(null);
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

  return (
    <div className="flex min-h-screen">
      {/* 사이드바 */}
      <aside className="w-48 bg-gray-800 text-white p-4 fixed h-full flex flex-col items-center">
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded w-full text-center"
          >
            {dict.logout}
          </button>
        )}
      </aside>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 ml-48 p-8">
        {/* 언어 전환 버튼 - 우상단 절대 위치 */}
        <div className="absolute top-4 right-4">
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

        <h2 className="text-2xl font-bold text-center mb-6">{dict.title}</h2>

        {isLoggedIn && userName && (
          <p className="text-center text-gray-700 mb-4">
            {dict.welcome} {userName}님!
          </p>
        )}

        <div className="flex justify-center mb-4">
          <button
            onClick={() => router.push("/blog/new")}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            {dict.create}
          </button>
        </div>

        {/* 검색 및 정렬 UI */}
        <div className="flex justify-center mb-4 space-x-2">
          <input
            type="text"
            placeholder={dict.searchPlaceholder}
            className="border rounded px-4 py-2 w-1/2"
            value={search}
            onChange={(e) => {
              const keyword = e.target.value;
              setSearch(keyword);
            }}
          />
          <button
            onClick={() => fetchPosts(search)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            {dict.search}
          </button>

          {search && (
            <button
              onClick={() => {
                setSearch("");
                fetchPosts("");
              }}
              className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
            >
              {dict.showAll}
            </button>
          )}

          {/* 정렬 버튼 */}
          <button
            onClick={() => setSortOrder("latest")}
            className={`px-4 py-2 rounded ${
              sortOrder === "latest" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {dict.latest}
          </button>
          <button
            onClick={() => setSortOrder("oldest")}
            className={`px-4 py-2 rounded ${
              sortOrder === "oldest" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {dict.oldest}
          </button>
        </div>

        <ul className="mt-6 space-y-4">
          {posts.length === 0 ? (
            <p className="text-center text-gray-500">{dict.noPosts}</p>
          ) : (
            posts.map((post) => ( // 'posts' 배열을 순회하며 각 'post'에 대해 렌더링. 이 부분은 문법적으로 올바름
              <li key={post.id} className="border p-4 rounded shadow flex flex-col md:flex-row items-start md:items-center">
                <div className="flex-grow">
                  {/* 게시글 제목 클릭 시 상세 페이지로 이동 */}
                  <h3
                    className="text-xl font-bold mb-2 cursor-pointer hover:text-blue-600 transition-colors duration-200"
                    onClick={() => router.push(`/blog/${post.id}`)}
                  >
                    {post.title}
                  </h3>
                  <p className="text-gray-600 mb-2 line-clamp-2">{post.content.split('\n')[0]}</p>
                  <p className="text-sm text-gray-500">
                    {dict.author}: {post.username} ・ {dict.date}: {formatCreatedAt(post.created_at)}
                  </p>
                </div>

                {/* 이미지 썸네일 (존재할 경우) */}
                {post.image_url && (
                  <div className="md:ml-4 flex-shrink-0 mt-4 md:mt-0">
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="w-24 h-24 object-cover rounded-md shadow-sm"
                    />
                  </div>
                )}

                {/* 본인만 수정/삭제 버튼 보이도록 (원래 기능) */}
                {userId === post.userid && (
                  <div className="mt-2 flex gap-2 md:ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/blog/${post.id}/edit`);
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                    >
                      {dict.edit}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePost(post.id);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                    >
                      {dict.delete}
                    </button>
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}