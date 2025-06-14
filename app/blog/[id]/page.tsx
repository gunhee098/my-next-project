"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useLang } from "@/components/LanguageProvider";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";
import { jwtDecode } from "jwt-decode"; // 💡 추가: jwtDecode 임포트
import { formatDistanceToNow, format } from "date-fns"; // 💡 추가: 날짜 포맷 임포트
import { ko } from "date-fns/locale"; // 💡 추가: 한국어 로케일 임포트

// 投稿データのインターフェース定義 (Postインターフェースを最新化)
interface Post {
  id: number;
  title: string;
  content: string;
  userid: number;
  image_url?: string;
  author?: {
    name: string;
  };
  created_at: string; // 💡 created_at으로 통일
  username: string; // 💡 username 추가 (GET 응답에서 받을 필드)
}

// JWT 토큰 디코딩 인터페이스 (재사용)
interface DecodedToken {
  id: number;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

// 投稿詳細ページコンポーネント
export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null); // 💡 타입 명확화
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null); // 💡 추가: 로그인된 유저 ID

  const { lang, setLang } = useLang();
  const dict = lang === "ja" ? ja : en;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      try {
        const decoded: DecodedToken = jwtDecode(token);
        setCurrentUserId(decoded.id); // 💡 로그인된 유저 ID 설정
      } catch (e) {
        console.error("Failed to decode token", e);
        setIsLoggedIn(false);
        setCurrentUserId(null);
      }
    } else {
      setIsLoggedIn(false);
      setCurrentUserId(null);
    }

    async function fetchPost() {
      try {
        const res = await fetch(`/api/posts/${postId}`);
        if (!res.ok) {
          throw new Error(dict.fetchPostFail);
        }
        const data: Post = await res.json(); // 💡 타입 명확화
        setPost(data);
        console.log("✅ 投稿の読み込みが完了しました:", data);
      } catch (err: any) {
        console.error("投稿の読み込み中にエラーが発生しました:", err);
        setError(err.message || dict.fetchPostFail);
      } finally {
        setLoading(false);
      }
    }

    if (postId) {
      fetchPost();
    }
  }, [postId, dict]);

  const handleDelete = async () => {
    if (!confirm(dict.confirmDelete)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error(dict.needLogin);
      }

      // 💡 DELETE 요청 시 id를 URL 파라미터로 보냄 (더 안정적)
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json", // 💡 Content-Type 추가
          Authorization: `Bearer ${token}`,
        },
        // body: JSON.stringify({ id: postId }), // 💡 body 제거 (URL 파라미터로 보내므로)
      });

      if (res.ok) {
        alert("投稿が正常に削除されました！");
        router.push("/blog");
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || dict.deleteFail);
      }
    } catch (err: any) {
      console.error("投稿の削除中にエラーが発生しました:", err);
      setError(err.message || dict.deleteFail);
    } finally {
      setLoading(false);
    }
  };

  // 💡 추가: 날짜 포맷 함수
  const formatCreatedAt = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 1000 * 60 * 60 * 24) {
      return formatDistanceToNow(date, { addSuffix: true, locale: ko });
    }

    return format(date, "yyyy.MM.dd");
  };


  if (loading) {
    return <div className="text-center py-8">{dict.loading}</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  if (!post) {
    return <div className="text-center py-8">{dict.fetchPostFail}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 relative">
      {/* 言語切り替えボタン - 右上固定 */}
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

      {/* 投稿詳細表示 */}
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      {/* 著者と日付情報の安全な表示 */}
      <p className="text-gray-600 text-sm mb-6">
        {dict.author}: {post.username || '不明'} | {dict.date}: {post.created_at ? formatCreatedAt(post.created_at) : '不明な日付'} {/* 💡 수정: username 사용, formatCreatedAt 적용 */}
      </p>

      {/* 画像表示 */}
      {post.image_url && (
        <div className="mb-6">
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full h-auto max-h-[500px] object-contain rounded-lg shadow-md"
          />
        </div>
      )}

      {/* コンテンツをHTMLとして安全にレンダリング、改行を<br />に変換 */}
      <div className="prose lg:prose-lg mb-8" dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}>
      </div>

      {/* 編集・削除ボタン (ログイン中かつ投稿者のみ表示) */}
      {isLoggedIn && currentUserId === post.userid && ( // 💡 수정: 로그인 유저와 게시글 유저 ID 비교
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => router.push(`/blog/${postId}/edit`)}
            className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {dict.edit}
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {dict.delete}
          </button>
        </div>
      )}

      {/* コメントセクション (TODO: 後で実装) */}
      <div className="mt-8 border-t pt-4">
        <h2 className="text-xl font-bold mb-4">{dict.comment}</h2>
        <p className="text-gray-500">{dict.comment} 機能はまだ実装されていません。</p>
      </div>

      {/* 投稿一覧へ戻るボタン */}
      <div className="mt-8 text-center">
        <button
          onClick={() => router.push("/blog")}
          className="text-blue-500 hover:underline"
        >
          &larr; 投稿一覧へ戻る
        </button>
      </div>
    </div>
  );
}