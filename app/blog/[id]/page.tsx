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
  return localStorage.getItem('token');
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

  // 投稿データを取得する関数
  const fetchPost = useCallback(async () => {
    setLoading(true); // ローディング状態を開始
    setError(null);    // エラー状態をリセット
    try {
      const token = getToken(); // ローカルストレージからトークンを取得
      if (!token) {
        router.push("/"); // ✅ /auth ではなくルート(/)にリダイレクト (ログインページ)
        return;
      }
      // 投稿取得APIを呼び出します。
      const res = await fetch(`/api/posts/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`, // 認証トークンをヘッダーに含めます。
        },
      });
      if (!res.ok) {
        // 401 Unauthorized の場合、認証エラーとしてログインページにリダイレクトします。
        if (res.status === 401) {
          setError(dict.authRequired); // ✅ 翻訳されたメッセージを使用
          router.push("/");
          return;
        }
        // その他のAPIエラーの場合、エラーをスローします。
        throw new Error(`${dict.failedToFetchPost}: ${res.statusText}`); // ✅ 翻訳されたメッセージを使用
      }
      const data = await res.json(); // レスポンスデータをJSONとしてパース
      setPost(data);                  // 投稿データを状態に設定
      setLikeCount(data._count.likes); // いいねの数を設定
    } catch (err) {
      // エラーが発生した場合、エラーメッセージを設定し、コンソールにエラーを出力します。
      setError(err instanceof Error ? err.message : dict.errorFetchingPostUnknown); // ✅ 翻訳されたメッセージを使用
      console.error("投稿の取得エラー:", err);
    } finally {
      setLoading(false); // ローディング状態を終了
    }
  }, [id, router, dict]); // ✅ dictを依存性配列に追加し、言語変更時に再実行

  // いいね状態を確認する関数 - エラー処理を改善
  const checkLikeStatus = useCallback(async () => {
    // ✅ user オブジェクトが null または user.id がない場合は即座にリターン (undefined 問題解決)
    if (!user || !user.id) {
      setIsLiked(false); // いいね状態をfalseに設定
      return;
    }

    try {
      const token = getToken(); // トークンを取得
      if (!token) return; // トークンがない場合は処理を中断

      // ✅ user.id をクエリパラメータとして安全に送信します。
      const res = await fetch(`/api/likes/status?postId=${id}&userId=${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`, // 認証トークンをヘッダーに含めます。
        },
      });
      if (!res.ok) {
        // 403 Forbidden エラーの処理を改善
        if (res.status === 403) {
          console.log(dict.likesStatusAuthNeededOrMismatch); 
          setIsLiked(false); // いいね状態をfalseに設定
          return;
        }
        // その他のAPIエラーの場合、コンソールにエラーを出力し、いいね状態をfalseに設定します。
        console.error(dict.failedToGetLikeStatus, res.statusText); 
        setIsLiked(false);
        return;
      }
      const data = await res.json(); // レスポンスデータをJSONとしてパース
      setIsLiked(data.isLiked);      // いいね状態を更新
    } catch (err) {
      // エラーが発生した場合、コンソールにエラーを出力し、いいね状態をfalseに設定します。
      console.error(dict.errorCheckingLikeStatus, err); 
      setIsLiked(false);
    }
  }, [id, user, dict]); // ✅ dictを依存性配列に追加し、言語変更時に再実行

  // コメントリストを取得する関数
  const fetchComments = useCallback(async () => {
    setCommentLoading(true); // コメントローディング状態を開始
    try {
      const token = getToken(); // トークンを取得
      if (!token) {
        setComments([]); // トークンがない場合はコメントを空の配列に設定
        return;
      }
      // コメント取得APIを呼び出します。
      const res = await fetch(`/api/comments?postId=${id}`, {
        headers: {
          Authorization: `Bearer ${token}`, // 認証トークンをヘッダーに含めます。
        },
      });
      if (!res.ok) {
        // APIエラーの場合、エラーをスローします。
        throw new Error(`${dict.failedToFetchComments}: ${res.statusText}`); 
      }
      const data = await res.json(); // レスポンスデータをJSONとしてパース
      setComments(data);             // コメントリストを状態に設定
    } catch (err) {
      // エラーが発生した場合、コンソールにエラーを出力し、エラーメッセージを設定します。
      console.error(dict.errorFetchingComments, err); 
      
    } finally {
      setCommentLoading(false); // コメントローディング状態を終了
    }
  }, [id, dict]); // ✅ dictを依存性配列に追加し、言語変更時に再実行

  // ✅ ユーザー変更時に強制的にコンポーネントを再レンダリングするためのキーを生成
  const userKey = user?.id || 'anonymous'; // userがnullの場合は'anonymous'を使用

  // ✅ userKey が変更されるたびに状態を初期化し、データを再取得します。
  // (ユーザーがログイン/ログアウトしたり、ユーザーIDが変わったりした場合にトリガーされます)
  useEffect(() => {
    // 認証情報がロードされていない場合は、処理を待機します。
    if (authLoading) return;

    // ユーザーが変更されたときに、いいね状態といいね数を初期化します。
    setIsLiked(false);
    setLikeCount(0);

    // 投稿データとコメントリストを再ロードします。
    fetchPost();
    fetchComments();

    // ユーザーが存在し、ユーザーIDがある場合にのみ、いいね状態を確認します。
    if (user && user.id) {
      checkLikeStatus();
    }
  }, [userKey, authLoading, fetchPost, fetchComments, checkLikeStatus, user]); 

  // ✅ いいね状態のみを確認する別のuseEffect (ユーザー情報が変更されるときに特に重要)
  // これにより、user.idの変化に敏感に反応し、最新のいいね状態を反映します。
  useEffect(() => {
    if (!authLoading && user && user.id) {
      checkLikeStatus();
    }
  }, [user?.id, authLoading, checkLikeStatus]); // user.id, authLoading, checkLikeStatus が変更されるときに実行

  // 投稿を削除するハンドラー
  const handleDelete = async () => {
    // ログインユーザーが投稿の作成者でない場合、警告を表示して処理を中断します。
    if (!user || user.id !== post?.userId) {
      alert(dict.noPermissionToDeletePost); 
      return;
    }
    // 削除確認のダイアログを表示します。
    if (!confirm(dict.confirmDeletePost)) { 
      return;
    }

    try {
      const token = getToken(); // トークンを取得
      if (!token) {
        alert(dict.authRequired); 
        router.push("/");
        return;
      }
      // 投稿削除APIを呼び出します。
      const res = await fetch(`/api/posts/${id}`, {
        method: "DELETE", // HTTP DELETE メソッドを使用
        headers: {
          Authorization: `Bearer ${token}`, // 認証トークンをヘッダーに含めます。
        },
      });
      if (!res.ok) {
        // 401 Unauthorized の場合、認証エラーを警告し、ログインページにリダイレクトします。
        if (res.status === 401) {
          alert(dict.authRequired); 
          router.push("/");
          return;
        }
        // その他のAPIエラーの場合、エラーをスローします。
        throw new Error(`${dict.deleteFail}: ${res.statusText}`); 
      }
      alert(dict.postDeletedSuccess); 
      router.push("/blog"); // 投稿一覧ページにリダイレクト
    } catch (err) {
      // エラーが発生した場合、アラートとコンソールにエラーを出力します。
      alert(`${dict.errorDeletingPost}: ${err instanceof Error ? err.message : dict.unknownError}`); 
      console.error("投稿の削除エラー:", err);
    }
  };

  // いいねをトグルするハンドラー (いいねのON/OFFを切り替える)
  const handleLikeToggle = async () => {
    // ユーザーがログインしていない場合、トグル不可
    if (!user) {
        alert(dict.authRequired); // ログイン必要アラート
        return;
    }
    try {
      const token = getToken(); // トークンを取得
      if (!token) {
        console.error(dict.tokenNotFound); 
        return;
      }
      // いいねAPIを呼び出します。
      // このAPIは、すでにいいね済みなら削除し、なければ作成するトグル機能を持つと仮定しています。
      const res = await fetch("/api/likes", {
        method: "POST", // HTTP POST メソッドを使用
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // 認証トークンをヘッダーに含めます。
        },
        body: JSON.stringify({ postId: id }), // 投稿IDをボディに含めて送信
      });

      if (!res.ok) {
        // 401 Unauthorized の場合、認証エラーをコンソールに出力します。
        if (res.status === 401) {
          console.error(dict.authErrorInvalidToken); 
          return;
        }
        // その他のAPIエラーの場合、エラーをスローします。
        throw new Error(`${dict.failedToOperateLike}: ${res.statusText}`); 
      }

      const data = await res.json(); // レスポンスデータをJSONとしてパース
      setIsLiked(data.isLiked);      // いいね状態を更新
      setLikeCount((prev) => (data.isLiked ? prev + 1 : prev - 1)); // いいね数も更新

    } catch (err) {
      // エラーが発生した場合、コンソールとアラートにエラーを出力します。
      console.error(dict.likeOperationError, err); 
      alert(`${dict.errorOperatingLike}: ${err instanceof Error ? err.message : dict.unknownError}`); 
    }
  };

  // 新しいコメントを送信するハンドラー
  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault(); // フォームのデフォルト送信を防ぎます。
    // ユーザーがログインしていない場合はコメント投稿不可
    if (!user) {
        alert(dict.authRequired); // ログイン必要アラート
        return;
    }
    // コメント内容が空の場合、警告を表示して処理を中断します。
    if (!newCommentContent.trim()) {
      alert(dict.commentCannotBeEmpty); 
      return;
    }

    setCommentLoading(true); // コメント送信ローディング状態を開始
    try {
      const token = getToken(); // トークンを取得
      if (!token) {
        console.error(dict.tokenNotFound); 
        setCommentLoading(false);
        return;
      }
      // コメント投稿APIを呼び出します。
      const res = await fetch("/api/comments", {
        method: "POST", // HTTP POST メソッドを使用
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // 認証トークンをヘッダーに含めます。
        },
        body: JSON.stringify({
          postId: id,                // 関連する投稿ID
          content: newCommentContent, // 新しいコメントの内容
        }),
      });

      if (!res.ok) {
        // 401 Unauthorized の場合、認証エラーをコンソールに出力します。
        if (res.status === 401) {
          console.error(dict.authErrorInvalidToken); 
          setCommentLoading(false);
          return;
        }
        // その他のAPIエラーの場合、エラーをスローします。
        throw new Error(`${dict.failedToPostComment}: ${res.statusText}`); 
      }

      setNewCommentContent(""); // コメント入力フィールドをクリア
      await fetchComments();    // コメントリストを最新の状態に更新
      // コメントが正常に投稿されたことへのアラートなどは不要。

    } catch (err) {
      // エラーが発生した場合、コンソールとアラートにエラーを出力します。
      console.error(dict.commentPostError, err); 
      alert(`${dict.errorPostingComment}: ${err instanceof Error ? err.message : dict.unknownError}`); 
    } finally {
      setCommentLoading(false); // コメント送信ローディング状態を終了
    }
  };

  // ✅ コメント削除ハンドラー (本人が作成したコメントのみ削除可能)
  const handleCommentDelete = async (commentId: string) => {
    // ユーザーがログインしていない場合はコメント削除不可
    if (!user) {
        alert(dict.authRequired); // ログイン必要アラート
        return;
    }
    // 削除確認のダイアログを表示します。
    if (!confirm(dict.confirmDeleteComment)) { 
      return;
    }

    try {
      const token = getToken(); // トークンを取得
      if (!token) {
        alert(dict.authRequired); 
        return;
      }

      // コメント削除APIを呼び出します。(DELETE リクエスト)
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE", // HTTP DELETE メソッドを使用
        headers: {
          Authorization: `Bearer ${token}`, // 認証トークンをヘッダーに含めます。
        },
      });

      if (!res.ok) {
        // APIエラーの種類に応じた処理
        if (res.status === 401) {
          alert(dict.authRequired); 
          return;
        }
        if (res.status === 403) { // 権限なしエラー (Forbidden)
          alert(dict.noPermissionToDeleteComment); 
          return;
        }
        // その他のAPIエラーの場合、エラーをスローします。
        throw new Error(`${dict.failedToDeleteComment}: ${res.statusText}`); 
      }

      // 削除成功時にコメントリストを更新
      await fetchComments();
      alert(dict.commentDeletedSuccess); 

    } catch (err) {
      // エラーが発生した場合、コンソールとアラートにエラーを出力します。
      console.error(dict.commentDeleteError, err); 
      alert(`${dict.errorDeletingComment}: ${err instanceof Error ? err.message : dict.unknownError}`); 
    }
  };

  // ✅ 現在のユーザーが投稿の作成者であるかを確認 (UIの再レンダリングを保証)
  const isPostOwner = user && user.id === post?.userId; // postがnullの場合に備え、オプショナルチェイニングを適用

 // ロード中表示
 if (loading || authLoading) {
  return (
    <div className={`min-h-screen transition-all duration-500 ${
      theme === 'dark' 
        ? 'dark bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      <div className="flex items-center justify-center min-h-screen">
        <div className={`text-center p-8 rounded-3xl ${
          theme === 'dark'
            ? 'bg-gray-800/60 backdrop-blur-2xl border border-gray-700/30 text-white'
            : 'bg-white/70 backdrop-blur-2xl border border-white/50 text-gray-900'
        } shadow-2xl transform hover:scale-105 transition-all duration-300`}>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500/30 border-t-blue-500 mx-auto mb-6"></div>
          <p className="text-xl font-semibold">{dict.loading}</p>
          <p className="text-sm opacity-60 mt-2">しばらくお待ちください...</p>
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
        <div className={`text-center p-8 rounded-3xl ${
          theme === 'dark'
            ? 'bg-red-900/60 backdrop-blur-2xl border border-red-700/30 text-red-200'
            : 'bg-red-50/70 backdrop-blur-2xl border border-red-200/50 text-red-900'
        } shadow-2xl max-w-md w-full transform hover:scale-105 transition-all duration-300`}>
          <svg className="w-20 h-20 mx-auto mb-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold mb-4">{dict.error}</h2>
          <p className="mb-6 leading-relaxed opacity-90">{error}</p>
          <Link
            href="/blog"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
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

// 投稿が見つからない場合に表示
if (!post) {
  return (
    <div className={`min-h-screen transition-all duration-500 ${
      theme === 'dark' 
        ? 'dark bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className={`text-center p-8 rounded-3xl ${
          theme === 'dark'
            ? 'bg-gray-800/60 backdrop-blur-2xl border border-gray-700/30 text-gray-200'
            : 'bg-white/70 backdrop-blur-2xl border border-white/50 text-gray-900'
        } shadow-2xl max-w-md w-full transform hover:scale-105 transition-all duration-300`}>
          <svg className="w-20 h-20 mx-auto mb-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-2xl font-bold mb-4">{dict.postNotFound}</h2>
          <p className="mb-6 opacity-70">リクエストされた投稿は見つかりませんでした。</p>
          <Link
            href="/blog"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
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

// コンポーネントのレンダリング
return (
  <div className={`min-h-screen transition-all duration-500 ${
    theme === 'dark' 
      ? 'dark bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900' 
      : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
  }`} key={userKey}>
    
    {/* 上部ヘッダー: スティッキー、ブラー効果、言語/テーマトグル */}
    <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/10">
      <div className={`${
        theme === 'dark' ? 'bg-gray-900/80' : 'bg-white/80'
      } transition-all duration-300`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
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

          {/* 言語切り替えとテーマトグルボタン - 右上 */}
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
    </header>

    {/* メインコンテンツ領域 */}
    <main className="max-w-4xl mx-auto px-6 py-12">
      {/* 投稿詳細カード */}
      <article className={`relative rounded-3xl p-8 mb-12 transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-gray-800/40 backdrop-blur-2xl border border-gray-700/30'
          : 'bg-white/70 backdrop-blur-2xl border border-white/50'
      } shadow-xl hover:shadow-2xl transform hover:scale-[1.01]`}>
        
        {/* 投稿タイトル */}
        <h1 className={`text-4xl sm:text-5xl font-extrabold mb-4 leading-tight ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          {post.title}
        </h1>

        {/* 投稿者情報と作成日 */}
        <div className="flex items-center text-sm mb-6">
          <span className={`font-semibold ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {post.username || dict.unknownUser}
          </span>
          <span className={`mx-2 ${
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
          <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-auto max-h-[500px] object-cover object-center transition-all duration-300 hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "/placeholder-image.png";
                target.alt = dict.imageLoadError;
              }}
            />
          </div>
        )}

        {/* 投稿内容 - 改善されたタイポグラフィ */}
        <div className={`prose prose-lg max-w-none mb-8 ${ 
          theme === 'dark' 
            ? 'prose-invert text-gray-300 prose-headings:text-white prose-a:text-blue-400 prose-strong:text-white' 
            : 'text-gray-700 prose-headings:text-gray-900 prose-a:text-blue-600 prose-strong:text-gray-800'
        }`}>
          <div className="whitespace-pre-wrap leading-relaxed text-base sm:text-lg">
            {post.content}
          </div>
        </div>

        {/* アクションバー - いいね、コメント数、共有 */}
        <div className="flex items-center justify-between pt-8 border-t border-gray-200/20 dark:border-gray-700/20">
          
          {/* 左側: インタラクションボタン */}
          <div className="flex items-center gap-4 sm:gap-6">
            
            {/* いいねボタン - 改善されたアニメーション */}
            <button
              onClick={handleLikeToggle}
              className={`group flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-3 rounded-full transition-all duration-300 ${
                isLiked
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 shadow-lg shadow-red-500/20'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                    : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
              } transform hover:scale-105`}
              aria-label={isLiked ? dict.unlike : dict.like}
            >
              <svg 
                className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${
                  isLiked ? 'fill-current scale-110' : 'group-hover:scale-125'
                }`} 
                fill={isLiked ? "currentColor" : "none"} 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="font-bold text-sm sm:text-lg">{likeCount}</span>
            </button>
            
            {/* コメント数 - 改善されたスタイル */}
            <div className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-3 rounded-full ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="font-bold text-sm sm:text-lg">{comments.length} {dict.comments}</span>
            </div>

            {/* 共有ボタン - 新規追加 */}
            <button className={`p-2 sm:p-3 rounded-full transition-all duration-300 ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'
            } transform hover:scale-105`}>
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>
          </div>

          {/* 右側: 投稿者専用アクションボタン */}
          {isPostOwner && (
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* 編集ボタン */}
              <Link
                href={`/blog/${id}/edit`}
                className="group flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="hidden sm:inline">{dict.edit}</span> 
              </Link>
              
              {/* 削除ボタン */}
              <button
                onClick={handleDelete}
                className="group flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium rounded-xl hover:from-red-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className={`rounded-2xl p-6 mb-8 transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-gray-800/40 backdrop-blur-2xl border border-gray-700/30'
            : 'bg-white/70 backdrop-blur-2xl border border-white/50'
        } shadow-xl hover:shadow-2xl transform hover:scale-[1.005]`}>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <span className="text-white text-lg font-bold">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <h3 className={`text-xl font-bold ${
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
                className={`w-full p-5 pr-16 rounded-xl border-2 resize-none transition-all duration-200 ${
                  theme === 'dark'
                    ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:bg-gray-700/70 focus:border-blue-500/50'
                    : 'bg-white/80 border-gray-200/50 text-gray-900 placeholder-gray-500 focus:bg-white focus:border-blue-500/50'
                } focus:outline-none focus:ring-4 focus:ring-blue-500/20`}
                rows={4}
                maxLength={500} 
                disabled={commentLoading}
              />
              
              {/* 送信ボタン - 改善されたデザイン */}
              <button
                type="submit"
                disabled={commentLoading || !newCommentContent.trim()}
                className={`absolute bottom-4 right-4 p-3 rounded-xl transition-all duration-200 ${
                  commentLoading || !newCommentContent.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white transform hover:scale-110 shadow-lg hover:shadow-xl'
                }`}
              >
                {commentLoading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {newCommentContent.length}/500 {dict.characters || 'characters'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewCommentContent('')}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Clear
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className={`rounded-2xl p-8 text-center mb-8 transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-gray-800/40 backdrop-blur-2xl border border-gray-700/30 text-gray-300'
            : 'bg-white/70 backdrop-blur-2xl border border-white/50 text-gray-600'
        } shadow-xl`}>
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="text-xl font-semibold mb-2">{dict.loginRequired || 'Login Required'}</h3>
          <p className="mb-4">{dict.loginToComment || 'Please log in to comment.'}</p>
          <Link
            href="/login"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {dict.loginButton || 'Login'}
          </Link>
        </div>
      )}

      {/* コメント一覧 */}
      {comments.length > 0 && (
        <div className={`rounded-2xl p-6 transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-gray-800/40 backdrop-blur-2xl border border-gray-700/30'
            : 'bg-white/70 backdrop-blur-2xl border border-white/50'
        } shadow-xl hover:shadow-2xl`}>
          
          <div className="flex items-center gap-4 mb-8">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {dict.comments} ({comments.length})
            </h3>
          </div>

          <div className="space-y-6">
            {comments.map((comment, index) => (
              <div
                key={comment.id}
                className={`p-6 rounded-xl transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/20'
                    : 'bg-gray-50/50 hover:bg-gray-50/80 border border-gray-200/30'
                } transform hover:scale-[1.005] hover:shadow-lg animate-fade-in`} 
                style={{ animationDelay: `${index * 50}ms` }}
              >
                
                {/* コメントヘッダー */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    
                    {/* プロフィールアバター */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg flex-shrink-0">
                      <span className="text-white text-lg font-bold">
                        {comment.user.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    
                    <div>
                      <p className={`font-bold text-lg ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                      }`}>
                        {comment.user.name || dict.unknownUser}
                      </p>
                      <p className={`text-sm flex items-center gap-2 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(comment.createdAt).toLocaleDateString('ja-JP', {
                            year: 'numeric', month: 'long', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* コメント投稿者である場合の削除ボタン */}
                  {user && user.id === comment.userId && (
                    <button
                      onClick={() => handleCommentDelete(comment.id)}
                      className={`group p-2 rounded-lg transition-all duration-200 ${
                        theme === 'dark'
                          ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                          : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                      } transform hover:scale-110`}
                    >
                      <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* コメント内容 */}
                <div className={`leading-7 text-lg ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <p className="whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>

    {/* 下部の余白 */}
    <div className="h-16"></div>
  </div>
);
}