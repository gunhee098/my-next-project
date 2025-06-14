"use client";

import { useEffect, useState, useCallback } from "react"; // useCallback 추가
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { formatDistanceToNow, format } from "date-fns";
import { ko } from "date-fns/locale";
import { useLang } from "@/components/LanguageProvider"; // 꼭 상대 경로 아닌 alias로 import
import en from "@/locales/en.json"; // 💡 수정: 상대 경로에서 alias로 변경
import ja from "@/locales/ja.json"; // 💡 수정: 상대 경로에서 alias로 변경


interface Post {
  id: number;
  title: string;
  content: string;
  userid: number;
  created_at: string;
  username: string;
  image_url?: string; // 💡 추가: 이미지 URL 필드
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

  // 💡 수정: fetchPosts를 useCallback으로 래핑하여 의존성 배열에 포함 가능하게 함
  const fetchPosts = useCallback(async (keyword = "") => {
    try {
      // 💡 수정: 백엔드 API에 검색, 정렬 파라미터 전달하도록 수정 (고객님 원래 코드는 검색만)
      const queryParams = new URLSearchParams();
      if (keyword) {
        queryParams.append("search", encodeURIComponent(keyword));
      }
      if (sortOrder) { // sortOrder가 변경될 때마다 fetchPosts가 재실행되도록
        queryParams.append("orderBy", sortOrder);
      }
      // TODO: 백엔드에서 사용자 필터링을 지원한다면 selectedAuthorId도 추가 가능

      const url = `/api/posts?${queryParams.toString()}`;

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("서버 응답 실패");

      const data: Post[] = await res.json();
      setPosts(data);
    } catch (error) {
      console.error("게시글 불러오기 실패:", error);
    }
  }, [sortOrder]); // 💡 수정: sortOrder가 변경될 때마다 fetchPosts가 재실행되도록

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        setIsLoggedIn(true);
        setUserId(decoded.id);
        setUserEmail(decoded.email);
        setUserName(decoded.name);
      } catch (err) {
        console.error("토큰 디코딩 오류:", err);
        setIsLoggedIn(false); // 토큰 오류시 로그인 상태 해제
        setUserId(null);
        setUserEmail(null);
        setUserName(null);
      }
    } else {
      setIsLoggedIn(false);
      setUserId(null);
      setUserEmail(null);
      setUserName(null);
    }

    fetchPosts(search); // 초기 로딩 시 검색어와 정렬 순서 적용
  }, [fetchPosts, search]); // 💡 수정: search가 변경될 때도 fetchPosts 재실행 (검색 버튼 없이 입력 즉시)

  const handleDeletePost = async (id: number) => {
    if (!confirm(dict.confirmDelete)) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error(dict.needLogin);

      const res = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || dict.deleteFail);
      }

      fetchPosts(search); // 삭제 후 현재 검색/정렬 상태 유지하며 다시 불러오기
    } catch (error) {
      console.error("삭제 실패:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setUserId(null);
    setUserEmail(null);
    setUserName(null); // userName도 초기화
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

  // 💡 삭제: 클라이언트 측 정렬 로직 (API에서 정렬해서 가져오므로 필요 없음)
  // const sortedPosts = [...(posts || [])].sort((a, b) =>
  //   sortOrder === "latest"
  //     ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  //     : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  // );

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

        {isLoggedIn && userName && ( // userName 사용
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
              // 💡 수정: 검색 버튼을 누르지 않아도 바로 검색 적용 (API 호출)
              // if (keyword === "") fetchPosts(""); // 빈 문자열일 때도 다시 불러오기
            }}
          />
          <button
            onClick={() => fetchPosts(search)} // 💡 수정: 검색 버튼 클릭 시 fetchPosts 호출
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            {dict.search}
          </button>

          {search && (
            <button
              onClick={() => {
                setSearch("");
                fetchPosts(""); // 💡 수정: 검색어 초기화 후 fetchPosts 호출
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
          {posts.length === 0 ? ( // 💡 수정: sortedPosts 대신 posts.length로 체크
            <p className="text-center text-gray-500">{dict.noPosts}</p>
          ) : (
            posts.map((post) => ( // 💡 수정: sortedPosts 대신 posts 사용
              <li key={post.id} className="border p-4 rounded shadow flex flex-col md:flex-row items-start md:items-center">
                <div className="flex-grow">
                  {/* 게시글 제목 클릭 시 상세 페이지로 이동 */}
                  <h3
                    className="text-xl font-bold mb-2 cursor-pointer hover:text-blue-600 transition-colors duration-200"
                    onClick={() => router.push(`/blog/${post.id}`)}
                  >
                    {post.title}
                  </h3>
                  <p className="text-gray-600 mb-2 line-clamp-2">{post.content.split('\n')[0]}</p> {/* 미리보기 */}
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
                        e.stopPropagation(); // li 클릭 이벤트 전파 방지
                        router.push(`/blog/${post.id}/edit`);
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                    >
                      {dict.edit}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // li 클릭 이벤트 전파 방지
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