// 📂 app/blog/[id]/page.tsx

"use client"; // クライアントコンポーネントとして指定します。

import React, { useEffect, useState, FormEvent, useCallback, use, type ReactNode } from "react";
import { useRouter } from "next/navigation"; // Next.jsのルーターフックをインポートします。
import Link from "next/link"; // Next.jsのLinkコンポーネントをインポートします。
import { useAuth } from "@/hooks/useAuth"; // useAuth フックをインポートします。
import { useLang } from "@/components/LanguageProvider"; // ✅ useLang フックをインポートします。
import en from "@/locales/en.json"; // ✅ 英語のロケールデータをインポートします。
import ja from "@/locales/ja.json"; // ✅ 日本語のロケールデータをインポートします。

// ✅ next-themesのuseThemeフックをインポートします。
import { useTheme } from "@/components/ThemeProvider"; // テーマプロバイダーからuseThemeフックをインポートします。
// ✅ ThemeToggleButtonコンポーネントをインポートします。
import ThemeToggleButton from "@/components/ThemeToggleButton";
import ShareButton from "@/components/ShareButton";

// 投稿データの型定義
interface Post {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  username: string; // 投稿作成者名
  createdAt: string;
  userId: string; // 投稿作成者ID
  _count: {
    likes: number;    // いいねの数
    comments: number; // コメントの数
  };
}

// コメントデータの型定義
interface Comment {
  id: string;
  content: string;
  userId: string; // コメント作成者ID
  postId: string;
  createdAt: string;
  user: {
    id: string;    // コメント作成者のユーザーオブジェクトのID
    name: string; // コメント作成者名
  };
}

// プロップスの型定義 (paramsオブジェクトを含む) - Next.js 15 対応
interface PostDetailPageProps {
  params: Promise<{
    id: string; // 投稿ID
  }>;
}

// localStorage を安全に使用するためのヘルパー関数
const getToken = (): string | null => {
  // サーバーサイドレンダリング時には window オブジェクトがないため、チェックが必要です。
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem("token") || localStorage.getItem("token");
};

/**
 * PostDetailPage コンポーネント
 * 個別の投稿の詳細を表示し、いいね、コメント、投稿の編集/削除機能を提供します。
 * @param {PostDetailPageProps} { params } - URLパラメータから投稿IDを取得します。
 */
export default function PostDetailPage({ params }: PostDetailPageProps) {
  // ✅ Next.js 15 対応: React.use() を使用して params Promise をアンラップ(unwrap)します。
  const { id } = use(params);

  // 投稿の状態管理
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // いいねの状態管理
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(0);

  // コメント関連の状態管理
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentContent, setNewCommentContent] = useState<string>("");
  const [commentLoading, setCommentLoading] = useState<boolean>(false);

  // useAuth フックから認証されたユーザー情報と認証ローディング状態を取得します。
  const { user, loading: authLoading, checkAuth } = useAuth();
  const router = useRouter(); // Next.jsルーターのインスタンス

  // ✅ useLang フックから言語設定を取得し、辞書を選択します。
  const { lang, setLang } = useLang();
  const dict = lang === "ja" ? ja : en;

  // ✅ useThemeフックを使用して現在のテーマ状態を取得します。
  const { theme } = useTheme();

  // 投稿データ取得関数
  const fetchPost = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        router.push("/");
        return;
      }
      const res = await fetch(`/api/posts/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError(dict.authRequired);
          router.push("/");
          return;
        }
        throw new Error(`${dict.failedToFetchPost}: ${res.statusText}`);
      }
      const data = await res.json();
      setPost(data);
      setLikeCount(data._count.likes);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.errorFetchingPostUnknown);
      console.error("投稿の取得エラー:", err);
    } finally {
      setLoading(false);
    }
  }, [id, router, dict]);

  // いいね状態確認関数
  const checkLikeStatus = useCallback(async () => {
    if (!user || !user.id) {
      setIsLiked(false);
      return;
    }

    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch(`/api/likes/status?postId=${id}&userId=${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        if (res.status === 403) {
          console.log(dict.likesStatusAuthNeededOrMismatch); 
          setIsLiked(false);
          return;
        }
        console.error(dict.failedToGetLikeStatus, res.statusText); 
        setIsLiked(false);
        return;
      }
      const data = await res.json();
      setIsLiked(data.isLiked);
    } catch (err) {
      console.error(dict.errorCheckingLikeStatus, err); 
      setIsLiked(false);
    }
  }, [id, user, dict]);

  // コメント一覧取得関数
  const fetchComments = useCallback(async () => {
    setCommentLoading(true);
    try {
      const token = getToken();
      if (!token) {
        setComments([]);
        return;
      }
      const res = await fetch(`/api/comments?postId=${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(`${dict.failedToFetchComments}: ${res.statusText}`); 
      }
      const data = await res.json();
      setComments(data);
    } catch (err) {
      console.error(dict.errorFetchingComments, err); 
    } finally {
      setCommentLoading(false);
    }
  }, [id, dict]);

  // ユーザー変更時強制再レンダリング用キー
  const userKey = user?.id || 'anonymous';

  // useEffect フック
  useEffect(() => {
    if (authLoading) return;
    setIsLiked(false);
    setLikeCount(0);
    fetchPost();
    fetchComments();
    if (user && user.id) {
      checkLikeStatus();
    }
  }, [userKey, authLoading, fetchPost, fetchComments, checkLikeStatus, user]); 

  useEffect(() => {
    if (!authLoading && user && user.id) {
      checkLikeStatus();
    }
  }, [user?.id, authLoading, checkLikeStatus]);

  // 投稿削除ハンドラー
  const handleDelete = async () => {
    if (!user || user.id !== post?.userId) {
      alert(dict.noPermissionToDeletePost); 
      return;
    }
    if (!confirm(dict.confirmDeletePost)) { 
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        alert(dict.authRequired); 
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
        if (res.status === 401) {
          alert(dict.authRequired); 
          router.push("/");
          return;
        }
        throw new Error(`${dict.deleteFail}: ${res.statusText}`); 
      }
      alert(dict.postDeletedSuccess); 
      router.push("/blog");
    } catch (err) {
      alert(`${dict.errorDeletingPost}: ${err instanceof Error ? err.message : dict.unknownError}`); 
      console.error("投稿の削除エラー:", err);
    }
  };

  // いいね切り替えハンドラー
  const handleLikeToggle = async () => {
    if (!user) {
        alert(dict.authRequired);
        return;
    }
    try {
      const token = getToken();
      if (!token) {
        console.error(dict.tokenNotFound); 
        return;
      }
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ postId: id }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          console.error(dict.authErrorInvalidToken); 
          return;
        }
        throw new Error(`${dict.failedToOperateLike}: ${res.statusText}`); 
      }

      const data = await res.json();
      setIsLiked(data.isLiked);
      setLikeCount((prev) => (data.isLiked ? prev + 1 : prev - 1));

    } catch (err) {
      console.error(dict.likeOperationError, err); 
      alert(`${dict.errorOperatingLike}: ${err instanceof Error ? err.message : dict.unknownError}`); 
    }
  };

  // コメント送信ハンドラー
  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
        alert(dict.authRequired);
        return;
    }
    if (!newCommentContent.trim()) {
      alert(dict.commentCannotBeEmpty); 
      return;
    }

    setCommentLoading(true);
    try {
      const token = getToken();
      if (!token) {
        console.error(dict.tokenNotFound); 
        setCommentLoading(false);
        return;
      }
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          postId: id,
          content: newCommentContent,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          console.error(dict.authErrorInvalidToken); 
          setCommentLoading(false);
          return;
        }
        throw new Error(`${dict.failedToPostComment}: ${res.statusText}`); 
      }

      setNewCommentContent("");
      await fetchComments();

    } catch (err) {
      console.error(dict.commentPostError, err); 
      alert(`${dict.errorPostingComment}: ${err instanceof Error ? err.message : dict.unknownError}`); 
    } finally {
      setCommentLoading(false);
    }
  };

  // コメント削除ハンドラー
  const handleCommentDelete = async (commentId: string) => {
    if (!user) {
        alert(dict.authRequired);
        return;
    }
    if (!confirm(dict.confirmDeleteComment)) { 
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        alert(dict.authRequired); 
        return;
      }

      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          alert(dict.authRequired); 
          return;
        }
        if (res.status === 403) {
          alert(dict.noPermissionToDeleteComment); 
          return;
        }
        throw new Error(`${dict.failedToDeleteComment}: ${res.statusText}`); 
      }

      await fetchComments();
      alert(dict.commentDeletedSuccess); 

    } catch (err) {
      console.error(dict.commentDeleteError, err); 
      alert(`${dict.errorDeletingComment}: ${err instanceof Error ? err.message : dict.unknownError}`); 
    }
  };

  // 投稿作成者かどうか確認
  const isPostOwner = user && user.id === post?.userId;

 // ローディング中表示
 if (loading || authLoading) {
  return (
    <div className={`min-h-screen transition-all duration-500 ${
      theme === 'dark' 
        ? 'dark bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className={`text-center p-6 sm:p-8 rounded-3xl max-w-sm w-full ${
          theme === 'dark'
            ? 'bg-gray-800/60 backdrop-blur-2xl border border-gray-700/30 text-white'
            : 'bg-white/70 backdrop-blur-2xl border border-white/50 text-gray-900'
        } shadow-2xl transform hover:scale-105 transition-all duration-300`}>
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-blue-500/30 border-t-blue-500 mx-auto mb-4 sm:mb-6"></div>
          <p className="text-lg sm:text-xl font-semibold">{dict.loading}</p>
          <p className="text-xs sm:text-sm opacity-60 mt-2">しばらくお待ちください...</p>
        </div>
      </div>
    </div>
  );
}

// エラー発生時表示
if (error) {
  return (
    <div className={`min-h-screen transition-all duration-500 ${
      theme === 'dark' 
        ? 'dark bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className={`text-center p-6 sm:p-8 rounded-3xl ${
          theme === 'dark'
            ? 'bg-red-900/60 backdrop-blur-2xl border border-red-700/30 text-red-200'
            : 'bg-red-50/70 backdrop-blur-2xl border border-red-200/50 text-red-900'
        } shadow-2xl max-w-md w-full transform hover:scale-105 transition-all duration-300`}>
          <svg className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl sm:text-2xl font-bold mb-4">{dict.error}</h2>
          <p className="mb-6 leading-relaxed opacity-90 text-sm sm:text-base">{error}</p>
          <Link
            href="/blog"
            className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {dict.backToPostList || 'Back to Posts'}
          </Link>
        </div>
      </div>
    </div>
  );
}

// 投稿が存在しない場合の表示
if (!post) {
  return (
    <div className={`min-h-screen transition-all duration-500 ${
      theme === 'dark' 
        ? 'dark bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className={`text-center p-6 sm:p-8 rounded-3xl ${
          theme === 'dark'
            ? 'bg-gray-800/60 backdrop-blur-2xl border border-gray-700/30 text-gray-200'
            : 'bg-white/70 backdrop-blur-2xl border border-white/50 text-gray-900'
        } shadow-2xl max-w-md w-full transform hover:scale-105 transition-all duration-300`}>
          <svg className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-xl sm:text-2xl font-bold mb-4">{dict.postNotFound}</h2>
          <p className="mb-6 opacity-70 text-sm sm:text-base">リクエストされた投稿が見つかりません。</p>
          <Link
            href="/blog"
            className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {dict.backToPostList || 'Back to Posts'}
          </Link>
        </div>
      </div>
    </div>
  );
}

// コンポーネントレンダリング
return (
  <div className={`min-h-screen transition-all duration-500 ${
    theme === 'dark' 
      ? 'dark bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900' 
      : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
  }`} key={userKey}>
    
    {/* 上部ヘッダー: スティッキー、ブラー効果、言語/テーマ切り替え */}
    <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/10">
      <div className={`${
        theme === 'dark' ? 'bg-gray-900/80' : 'bg-white/80'
      } transition-all duration-300`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          
          {/* モバイルレイアウト */}
          <div className="flex flex-col space-y-3 sm:hidden">
            {/* 第一行: 戻るボタン */}
            <div className="flex justify-start">
              <Link 
                href="/blog" 
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                } transform hover:scale-105`}
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm">{dict.backToPostList}</span>
              </Link>
            </div>
            
            {/* 第二行: 言語切り替えとテーマ切り替え */}
            <div className="flex items-center justify-center space-x-3">
              <div className="inline-flex shadow-lg rounded-lg overflow-hidden">
                <button
                  onClick={() => setLang("en")}
                  className={`px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    lang === "en" ? "bg-blue-600 text-white" : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang("ja")}
                  className={`px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    lang === "ja" ? "bg-blue-600 text-white" : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  JP
                </button>
              </div>
              <ThemeToggleButton />
            </div>
          </div>

          {/* デスクトップレイアウト */}
          <div className="hidden sm:flex justify-between items-center">
            {/* 戻るリンク - 左上 */}
            <Link 
              href="/blog" 
              className={`group flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              } transform hover:scale-105`}
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>{dict.backToPostList}</span>
            </Link>

            {/* 言語切り替えとテーマ切り替えボタン - 右上 */}
            <div className="flex items-center space-x-4">
              <div className="inline-flex shadow-lg rounded-xl overflow-hidden">
                <button
                  onClick={() => setLang("en")}
                  className={`px-4 py-2 font-medium transition-all duration-200 ${
                    lang === "en" ? "bg-blue-600 text-white" : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang("ja")}
                  className={`px-4 py-2 font-medium transition-all duration-200 ${
                    lang === "ja" ? "bg-blue-600 text-white" : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  JP
                </button>
              </div>
              <ThemeToggleButton /> 
            </div>
          </div>
        </div>
      </div>
    </header>

    {/* メインコンテンツエリア */}
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      {/* 投稿詳細カード */}
      <article className={`relative rounded-2xl sm:rounded-3xl p-4 sm:p-8 mb-8 sm:mb-12 transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-gray-800/40 backdrop-blur-2xl border border-gray-700/30'
          : 'bg-white/70 backdrop-blur-2xl border border-white/50'
      } shadow-xl hover:shadow-2xl transform hover:scale-[1.01]`}>
        
        {/* 投稿タイトル */}
        <h1 className={`text-2xl sm:text-4xl md:text-5xl font-extrabold mb-4 leading-tight ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        } break-words`}>
          {post.title}
        </h1>

        {/* 投稿者情報と作成日 */}
        <div className="flex flex-col sm:flex-row sm:items-center text-sm mb-6 space-y-1 sm:space-y-0">
          <span className={`font-semibold ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {post.username || dict.unknownUser}
          </span>
          <span className={`hidden sm:inline mx-2 ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`}>•</span>
          <span className={`${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {new Date(post.createdAt).toLocaleDateString('ja-JP', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </span>
        </div>

        {/* 投稿画像 */}
        {post.imageUrl && (
          <div className="mb-6 sm:mb-8 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-auto max-h-[300px] sm:max-h-[500px] object-cover object-center transition-all duration-300 hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "/placeholder-image.png";
                target.alt = dict.imageLoadError;
              }}
            />
          </div>
        )}

        {/* 投稿内容 - 改良されたタイポグラフィ */}
        <div className={`prose prose-sm sm:prose-lg max-w-none mb-6 sm:mb-8 ${ 
          theme === 'dark' 
            ? 'prose-invert text-gray-300 prose-headings:text-white prose-a:text-blue-400 prose-strong:text-white' 
            : 'text-gray-700 prose-headings:text-gray-900 prose-a:text-blue-600 prose-strong:text-gray-800'
        }`}>
          <div className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base md:text-lg break-words">
            {post.content}
          </div>
        </div>

        {/* アクションバー - いいね、コメント数、共有 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-6 sm:pt-8 border-t border-gray-200/20 dark:border-gray-700/20 space-y-4 sm:space-y-0">
          
          {/* 左側: インタラクションボタン */}
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 justify-center sm:justify-start">
            
            {/* いいねボタン - 改善されたアニメーション */}
            <button
              onClick={handleLikeToggle}
              className={`group flex items-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 md:px-5 md:py-3 rounded-full transition-all duration-300 ${
                isLiked
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 shadow-lg shadow-red-500/20'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                    : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
              } transform hover:scale-105`}
              aria-label={isLiked ? dict.unlike : dict.like}
            >
              <svg 
                className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 transition-all duration-300 ${
                  isLiked ? 'fill-current scale-110' : 'group-hover:scale-125'
                }`} 
                fill={isLiked ? "currentColor" : "none"} 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="font-bold text-sm sm:text-base md:text-lg">{likeCount}</span>
            </button>
            
            {/* コメント数 - 改善されたスタイル */}
            <div className={`flex items-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 md:px-5 md:py-3 rounded-full ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="font-bold text-sm sm:text-base md:text-lg">{comments.length}</span>
              <span className="hidden sm:inline text-sm sm:text-base md:text-lg">{dict.comments}</span>
            </div>

            {/* 共有ボタン - 新規追加 */}
            {post && <ShareButton post={post} theme={theme} />}

          </div>

          {/* 右側: 投稿者専用アクションボタン */}
          {isPostOwner && (
            <div className="flex items-center gap-2 sm:gap-3 justify-center sm:justify-end">
              
              {/* 編集ボタン */}
              <Link
                href={`/blog/${id}/edit`}
                className="group flex items-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 md:px-5 md:py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="hidden sm:inline">{dict.edit}</span> 
              </Link>
              
              {/* 削除ボタン */}
              <button
                onClick={handleDelete}
                className="group flex items-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 md:px-5 md:py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium rounded-lg sm:rounded-xl hover:from-red-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">{dict.delete}</span> 
              </button>
            </div>
          )}
        </div>
      </article>

      {/* コメント投稿フォーム */}
      {user ? (
        <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-gray-800/40 backdrop-blur-2xl border border-gray-700/30'
            : 'bg-white/70 backdrop-blur-2xl border border-white/50'
        } shadow-xl hover:shadow-2xl transform hover:scale-[1.005]`}>
          
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-white text-sm sm:text-lg font-bold">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <h3 className={`text-lg sm:text-xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {dict.addComment || 'Add a Comment'}
            </h3>
          </div>
          
          <form onSubmit={handleCommentSubmit}>
            <div className="relative">
              <textarea
                value={newCommentContent}
                onChange={(e) => setNewCommentContent(e.target.value)}
                placeholder={dict.writeComment || 'Write your comment...'}
                className={`w-full p-3 sm:p-5 pr-12 sm:pr-16 rounded-lg sm:rounded-xl border-2 resize-none transition-all duration-200 ${
                  theme === 'dark'
                    ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:bg-gray-700/70 focus:border-blue-500/50'
                    : 'bg-white/80 border-gray-200/50 text-gray-900 placeholder-gray-500 focus:bg-white focus:border-blue-500/50'
                } focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-sm sm:text-base`}
                rows={3}
                maxLength={500} 
                disabled={commentLoading}
              />
              
              {/* 送信ボタン - 改善されたデザイン */}
              <button
                type="submit"
                disabled={commentLoading || !newCommentContent.trim()}
                className={`absolute bottom-3 sm:bottom-4 right-3 sm:right-4 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-200 ${
                  commentLoading || !newCommentContent.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white transform hover:scale-110 shadow-lg hover:shadow-xl'
                }`}
              >
                {commentLoading ? (
                  <div className="animate-spin w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full"></div>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
              <p className={`text-xs sm:text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              } text-center sm:text-left`}>
                {newCommentContent.length}/500 {dict.characters || 'characters'}
              </p>
              <div className="flex gap-2 justify-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setNewCommentContent('')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  クリア
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className={`rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center mb-6 sm:mb-8 transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-gray-800/40 backdrop-blur-2xl border border-gray-700/30 text-gray-300'
            : 'bg-white/70 backdrop-blur-2xl border border-white/50 text-gray-600'
        } shadow-xl`}>
          <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="text-lg sm:text-xl font-semibold mb-2">{dict.loginRequired || 'Login Required'}</h3>
          <p className="mb-4 text-sm sm:text-base">{dict.loginToComment || 'Please log in to comment.'}</p>
          <Link
            href="/login"
            className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
          >
            {dict.loginButton || 'Login'}
          </Link>
        </div>
      )}

      {/* コメント一覧 */}
      {comments.length > 0 && (
        <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-gray-800/40 backdrop-blur-2xl border border-gray-700/30'
            : 'bg-white/70 backdrop-blur-2xl border border-white/50'
        } shadow-xl hover:shadow-2xl`}>
          
          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className={`text-xl sm:text-2xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {dict.comments} ({comments.length})
            </h3>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {comments.map((comment, index) => (
              <div
                key={comment.id}
                className={`p-4 sm:p-6 rounded-lg sm:rounded-xl transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/20'
                    : 'bg-gray-50/50 hover:bg-gray-50/80 border border-gray-200/30'
                } transform hover:scale-[1.005] hover:shadow-lg animate-fade-in`} 
                style={{ animationDelay: `${index * 50}ms` }}
              >
                
                {/* コメントヘッダー */}
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    
                    {/* プロフィールアバター */}
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg flex-shrink-0">
                      <span className="text-white text-sm sm:text-lg font-bold">
                        {comment.user.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <p className={`font-bold text-sm sm:text-lg truncate ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                      }`}>
                        {comment.user.name || dict.unknownUser}
                      </p>
                      <p className={`text-xs sm:text-sm flex items-center gap-1 sm:gap-2 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="truncate">
                          {new Date(comment.createdAt).toLocaleDateString('ja-JP', {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* コメント投稿者の場合の削除ボタン */}
                  {user && user.id === comment.userId && (
                    <button
                      onClick={() => handleCommentDelete(comment.id)}
                      className={`group p-1.5 sm:p-2 rounded-lg transition-all duration-200 flex-shrink-0 ${
                        theme === 'dark'
                          ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                          : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                      } transform hover:scale-110`}
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* コメント内容 */}
                <div className={`leading-6 sm:leading-7 text-sm sm:text-base md:text-lg ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>

    {/* 下部余白 */}
    <div className="h-8 sm:h-16"></div>
  </div>
);
}