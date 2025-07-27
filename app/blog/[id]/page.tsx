// 📂 app/blog/[id]/page.tsx

"use client"; // クライアントコンポーネントとして指定します。

import React, { useEffect, useState, FormEvent, useCallback, use } from "react";
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
    id: string;   // コメント作成者のユーザーオブジェクトのID
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
  const { theme,  } = useTheme();

  // 投稿データを取得する関数
  const fetchPost = useCallback(async () => {
    setLoading(true); // ローディング状態を開始
    setError(null);   // エラー状態をリセット
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
          console.log(dict.likesStatusAuthNeededOrMismatch); // ✅ 翻訳されたメッセージを使用
          setIsLiked(false); // いいね状態をfalseに設定
          return;
        }
        // その他のAPIエラーの場合、コンソールにエラーを出力し、いいね状態をfalseに設定します。
        console.error(dict.failedToGetLikeStatus, res.statusText); // ✅ 翻訳されたメッセージを使用
        setIsLiked(false);
        return;
      }
      const data = await res.json(); // レスポンスデータをJSONとしてパース
      setIsLiked(data.isLiked);     // いいね状態を更新
    } catch (err) {
      // エラーが発生した場合、コンソールにエラーを出力し、いいね状態をfalseに設定します。
      console.error(dict.errorCheckingLikeStatus, err); // ✅ 翻訳されたメッセージを使用
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
        throw new Error(`${dict.failedToFetchComments}: ${res.statusText}`); // ✅ 翻訳されたメッセージを使用
      }
      const data = await res.json(); // レスポンスデータをJSONとしてパース
      setComments(data);             // コメントリストを状態に設定
    } catch (err) {
      // エラーが発生した場合、コンソールにエラーを出力し、エラーメッセージを設定します。
      console.error(dict.errorFetchingComments, err); // ✅ 翻訳されたメッセージを使用
      setError(err instanceof Error ? err.message : dict.errorFetchingCommentsUnknown); // ✅ 翻訳されたメッセージを使用
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
  }, [userKey, authLoading, fetchPost, fetchComments, checkLikeStatus, user]); // userKeyを依存性配列に追加し、ユーザー変更時に再実行

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
      alert(dict.noPermissionToDeletePost); // ✅ 翻訳されたメッセージを使用
      return;
    }
    // 削除確認のダイアログを表示します。
    if (!confirm(dict.confirmDeletePost)) { // ✅ 翻訳されたメッセージを使用
      return;
    }

    try {
      const token = getToken(); // トークンを取得
      if (!token) {
        alert(dict.authRequired); // ✅ 翻訳されたメッセージを使用
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
          alert(dict.authRequired); // ✅ 翻訳されたメッセージを使用
          router.push("/");
          return;
        }
        // その他のAPIエラーの場合、エラーをスローします。
        throw new Error(`${dict.deleteFail}: ${res.statusText}`); // ✅ 翻訳されたメッセージを使用
      }
      alert(dict.postDeletedSuccess); // ✅ 翻訳されたメッセージを使用
      router.push("/blog"); // 投稿一覧ページにリダイレクト
    } catch (err) {
      // エラーが発生した場合、アラートとコンソールにエラーを出力します。
      alert(`${dict.errorDeletingPost}: ${err instanceof Error ? err.message : dict.unknownError}`); // ✅ 翻訳されたメッセージを使用
      console.error("投稿の削除エラー:", err);
    }
  };

  // いいねをトグルするハンドラー (いいねのON/OFFを切り替える)
  const handleLikeToggle = async () => {
    try {
      const token = getToken(); // トークンを取得
      if (!token) {
        console.error(dict.tokenNotFound); // ✅ 翻訳されたメッセージを使用
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
          console.error(dict.authErrorInvalidToken); // ✅ 翻訳されたメッセージを使用
          return;
        }
        // その他のAPIエラーの場合、エラーをスローします。
        throw new Error(`${dict.failedToOperateLike}: ${res.statusText}`); // ✅ 翻訳されたメッセージを使用
      }

      const data = await res.json(); // レスポンスデータをJSONとしてパース
      setIsLiked(data.isLiked);     // いいね状態を更新
      setLikeCount((prev) => (data.isLiked ? prev + 1 : prev - 1)); // いいね数も更新

    } catch (err) {
      // エラーが発生した場合、コンソールとアラートにエラーを出力します。
      console.error(dict.likeOperationError, err); // ✅ 翻訳されたメッセージを使用
      alert(`${dict.errorOperatingLike}: ${err instanceof Error ? err.message : dict.unknownError}`); // ✅ 翻訳されたメッセージを使用
    }
  };

  // 新しいコメントを送信するハンドラー
  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault(); // フォームのデフォルト送信を防ぎます。
    // コメント内容が空の場合、警告を表示して処理を中断します。
    if (!newCommentContent.trim()) {
      alert(dict.commentCannotBeEmpty); // ✅ 翻訳されたメッセージを使用
      return;
    }

    setCommentLoading(true); // コメント送信ローディング状態を開始
    try {
      const token = getToken(); // トークンを取得
      if (!token) {
        console.error(dict.tokenNotFound); // ✅ 翻訳されたメッセージを使用
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
          console.error(dict.authErrorInvalidToken); // ✅ 翻訳されたメッセージを使用
          setCommentLoading(false);
          return;
        }
        // その他のAPIエラーの場合、エラーをスローします。
        throw new Error(`${dict.failedToPostComment}: ${res.statusText}`); // ✅ 翻訳されたメッセージを使用
      }

      setNewCommentContent(""); // コメント入力フィールドをクリア
      await fetchComments();    // コメントリストを最新の状態に更新
      // コメントが正常に投稿されたことへのアラートなどは不要。

    } catch (err) {
      // エラーが発生した場合、コンソールとアラートにエラーを出力します。
      console.error(dict.commentPostError, err); // ✅ 翻訳されたメッセージを使用
      alert(`${dict.errorPostingComment}: ${err instanceof Error ? err.message : dict.unknownError}`); // ✅ 翻訳されたメッセージを使用
    } finally {
      setCommentLoading(false); // コメント送信ローディング状態を終了
    }
  };

  // ✅ コメント削除ハンドラー (本人が作成したコメントのみ削除可能)
  const handleCommentDelete = async (commentId: string) => {
    // 削除確認のダイアログを表示します。
    if (!confirm(dict.confirmDeleteComment)) { // ✅ 翻訳されたメッセージを使用
      return;
    }

    try {
      const token = getToken(); // トークンを取得
      if (!token) {
        alert(dict.authRequired); // ✅ 翻訳されたメッセージを使用
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
          alert(dict.authRequired); // ✅ 翻訳されたメッセージを使用
          return;
        }
        if (res.status === 403) { // 権限なしエラー (Forbidden)
          alert(dict.noPermissionToDeleteComment); // ✅ 翻訳されたメッセージを使用
          return;
        }
        // その他のAPIエラーの場合、エラーをスローします。
        throw new Error(`${dict.failedToDeleteComment}: ${res.statusText}`); // ✅ 翻訳されたメッセージを使用
      }

      // 削除成功時にコメントリストを更新
      await fetchComments();
      alert(dict.commentDeletedSuccess); // ✅ 翻訳されたメッセージを使用

    } catch (err) {
      // エラーが発生した場合、コンソールとアラートにエラーを出力します。
      console.error(dict.commentDeleteError, err); // ✅ 翻訳されたメッセージを使用
      alert(`${dict.errorDeletingComment}: ${err instanceof Error ? err.message : dict.unknownError}`); // ✅ 翻訳されたメッセージを使用
    }
  };

  // ローディング中の表示
  if (loading || authLoading) {
    // ✅ ローディング画面にもダークモードクラスを適用します。
    return (
      <div className={`text-center py-8 min-h-screen flex items-center justify-center ${theme === 'dark' ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
        {dict.loading}...
      </div>
    );
  }

  // エラー発生時の表示
  if (error) {
    // ✅ エラー画面にもダークモードクラスを適用します。
    return (
      <div className={`text-center text-red-500 py-8 min-h-screen flex items-center justify-center ${theme === 'dark' ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
        {dict.error}: {error}
      </div>
    );
  }

  // 投稿が見つからない場合の表示
  if (!post) {
    // ✅ 投稿なし画面にもダークモードクラスを適用します。
    return (
      <div className={`text-center py-8 min-h-screen flex items-center justify-center ${theme === 'dark' ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
        {dict.postNotFound}
      </div>
    );
  }

  // ✅ 現在のユーザーが投稿の作成者であるかを確認 (UIの再レンダリングを保証)
  const isPostOwner = user && user.id === post.userId;

  // コンポーネントのレンダリング
  return (
    // ✅ 最上位のdivにダークモードクラスを適用: theme状態に応じて背景色とテキスト色を動的に変更します。
    <div className={`container mx-auto p-4 min-h-screen ${theme === 'dark' ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`} key={userKey}>
      {/* ✅ 言語切り替えボタンとダークモードトグルボタンを追加 */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-4">
        <div className="inline-flex shadow rounded overflow-hidden">
          <button
            onClick={() => setLang("en")}
            className={`px-3 py-1 font-medium ${
              lang === "en" ? "bg-blue-600 text-white" : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("ja")}
            className={`px-3 py-1 font-medium ${
              lang === "ja" ? "bg-blue-600 text-white" : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white"
            }`}
          >
            JP
          </button>
        </div>
        <ThemeToggleButton /> {/* ✅ ダークモードトグルボタンコンポーネント */}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6"> {/* ✅ ダークモード背景色およびテキスト色 */}
        <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100">{post.title}</h1> {/* ✅ ダークモードテキスト色 */}
        {post.imageUrl && (
          <div className="mb-4">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-auto max-h-96 object-contain rounded-lg"
              // 画像の読み込みエラーが発生した場合の処理
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null; // 無限ループを防ぐため、イベントハンドラーを削除
                target.src = "/placeholder-image.png"; // 代替画像を表示
                target.alt = dict.imageLoadError; // ✅ 翻訳されたメッセージを使用
              }}
            />
          </div>
        )}
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed mb-6">{post.content}</p> {/* ✅ ダークモードテキスト色 */}
        <div className="flex justify-between items-center text-sm text-gray-500 border-t pt-4 dark:border-gray-700"> {/* ✅ ダークモード境界線色 */}
          <span className="dark:text-gray-400">{dict.author}: {post.username}</span> {/* ✅ ダークモードテキスト色 */}
          <span className="dark:text-gray-400">{dict.postedOn}: {new Date(post.createdAt).toLocaleDateString()}</span> {/* ✅ ダークモードテキスト色 */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLikeToggle} // いいねトグルハンドラーを呼び出し
              className={`flex items-center text-lg ${isLiked ? 'text-red-500' : 'text-gray-400'} hover:text-red-600 transition-colors`}
              aria-label={isLiked ? dict.unlike : dict.like} // ✅ 翻訳されたメッセージを使用
            >
              ❤️ <span className="ml-1 text-sm">{likeCount}</span> {/* いいね数表示 */}
            </button>
            <span className="flex items-center text-lg text-gray-500">
              💬 <span className="ml-1 text-sm">{comments.length}</span> {/* コメント数表示 */}
            </span>
          </div>
        </div>

        {/* ✅ 投稿者のみ編集・削除ボタンを表示 - 強化された条件付きレンダリング */}
        {isPostOwner && (
          <div className="mt-6 flex space-x-4 justify-end">
            <Link
              href={`/blog/${id}/edit`}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              {dict.edit} {/* ✅ 翻訳されたメッセージを使用 */}
            </Link>
            <button
              onClick={handleDelete} // 削除ハンドラーを呼び出し
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              {dict.delete} {/* ✅ 翻訳されたメッセージを使用 */}
            </button>
          </div>
        )}
      </div>

      {/* コメントセクション */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"> {/* ✅ ダークモード背景色 */}
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">{dict.comments} ({comments.length})</h2> {/* ✅ ダークモードテキスト色 */}

        {/* 新しいコメント投稿フォーム */}
        <form onSubmit={handleCommentSubmit} className="mb-6">
          <textarea
            value={newCommentContent} // コメント内容の状態にバインド
            onChange={(e) => setNewCommentContent(e.target.value)} // 入力値の変更を更新
            placeholder={dict.enterCommentPlaceholder} // ✅ 翻訳されたメッセージを使用
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" // ✅ ダークモード入力フィールドスタイル
            required // 必須入力
            disabled={commentLoading} // コメント送信中は無効化
          ></textarea>
          <button
            type="submit"
            className="mt-3 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={commentLoading || !newCommentContent.trim()} // ローディング中または内容が空の場合はボタンを無効化
          >
            {commentLoading ? dict.sending : dict.postComment} {/* ✅ 翻訳されたメッセージを使用 */}
          </button>
        </form>

        {/* コメントリスト */}
        {commentLoading && comments.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">{dict.loadingComments}...</div> // ✅ ダークモードテキスト色
        ) : comments.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">{dict.noCommentsYet}.</div> // ✅ ダークモードテキスト色
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600"> {/* ✅ ダークモード背景色および境界線 */}
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800 dark:text-gray-100">{comment.user.name || dict.unknownUser}</span> {/* ✅ ダークモードテキスト色 */}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p> {/* ✅ ダークモードテキスト色 */}

                {/* ✅ コメント削除ボタン - 本人のコメントのみ表示 - 強化された条件付きレンダリング */}
                {user && user.id === comment.userId && (
                  <div className="mt-2 text-right">
                    <button
                      onClick={() => handleCommentDelete(comment.id)} // コメント削除ハンドラーを呼び出し
                      className="text-sm text-red-500 hover:text-red-700 hover:underline transition-colors px-2 py-1 border border-red-300 rounded dark:border-red-600" // ✅ ダークモード境界線およびボタン色
                    >
                      {dict.delete} {/* ✅ 翻訳されたメッセージを使用 */}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link href="/blog" className="text-blue-500 hover:underline">
          ← {dict.backToPostList} {/* ✅ 翻訳されたメッセージを使用 */}
        </Link>
      </div>
    </div>
  );
}