// 📂 app/blog/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image"; // Image 컴포넌트가 사용되지 않는 경우 제거 고려
import { useLang } from "@/components/LanguageProvider";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";
import { jwtDecode } from "jwt-decode"; // 💡 追加: jwtDecode インポート
import { formatDistanceToNow, format } from "date-fns"; // 💡 追加: 日付フォーマット インポート
import { ko } from "date-fns/locale"; // 💡 追加: 韓国語ロケール インポート

// 投稿データのインターフェース定義 (Postインターフェースを最新化)
interface Post {
  id: string; // 💡 修正: number -> string (UUIDのため)
  title: string;
  content: string;
  userId: string; // 💡 修正: userid -> userId (camelCase, string)
  imageUrl?: string | null; // 💡 修正: image_url -> imageUrl (camelCase)
  user?: { // author 대신 user 객체로 변경 (Prisma 관계 모델에 따라)
    name: string;
    email: string; // 필요시 추가
  };
  createdAt: string; // 💡 修正: created_at -> createdAt (camelCase)
  username: string; // GET 応答で受け取るフィールド (Post API에서 user.name을 username으로 매핑)
}

// JWT トークン デコーディング インターフェース (再利用)
interface DecodedToken {
  id: string; // 💡 修正: number -> string (UUIDのため)
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

  const [post, setPost] = useState<Post | null>(null); // 💡 タイプ明確化
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // 💡 修正: number -> string (UUIDのため)

  const { lang, setLang } = useLang();
  const dict = lang === "ja" ? ja : en;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      try {
        const decoded: DecodedToken = jwtDecode(token);
        setCurrentUserId(decoded.id); // 💡 ログインされたユーザーID設定 (string)
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
          // 💡 エラーメッセージの詳細化
          const errorData = await res.json().catch(() => ({ error: '不明なエラー' }));
          throw new Error(errorData.error || dict.fetchPostFail);
        }
        const data: Post = await res.json(); // 💡 タイプ明確化
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

      // 💡 DELETE リクエスト時、IDをURLパラメータで送信 (より安定的)
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        alert("投稿が正常に削除されました！");
        router.push("/blog");
      } else {
        const errorData = await res.json().catch(() => ({ error: '不明なエラー' })); // JSON 파싱 실패 대비
        // サーバーからのエラーメッセージがある場合はそれを使用し、ない場合は一般的なメッセージを表示
        throw new Error(errorData.error || dict.deleteFail);
      }
    } catch (err: any) {
      console.error("投稿の削除中にエラーが発生しました:", err);
      setError(err.message || dict.deleteFail);
    } finally {
      setLoading(false);
    }
  };

  // 💡 追加: 日付フォーマット関数
  const formatCreatedAt = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // 24時間以内なら「X時間前」のように表示
    if (diff < 1000 * 60 * 60 * 24) {
      return formatDistanceToNow(date, { addSuffix: true, locale: ko }); // date-fns의 locale은 ko를 사용
    }

    // それ以上なら「YYYY.MM.DD」形式で表示
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
        {dict.author}: {post.username || '不明'} | {dict.date}: {post.createdAt ? formatCreatedAt(post.createdAt) : '不明な日付'} {/* 💡 修正: createdAt 사용 */}
      </p>

      {/* 画像表示 */}
      {post.imageUrl && ( // 💡 修正: post.imageUrl 사용
        <div className="mb-6">
          <img
            src={post.imageUrl} // 💡 修正: post.imageUrl 사용
            alt={post.title}
            className="w-full h-auto max-h-[500px] object-contain rounded-lg shadow-md"
          />
        </div>
      )}

      {/* コンテンツをHTMLとして安全にレンダリング、改行を<br />に変換 */}
      <div className="prose lg:prose-lg mb-8" dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}>
      </div>

      {/* 編集・削除ボタン (ログイン中かつ投稿者のみ表示) */}
      {isLoggedIn && currentUserId === post.userId && ( // 💡 修正: post.userId와 비교
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