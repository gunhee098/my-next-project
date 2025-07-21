// 📂 app/blog/[id]/page.tsx

"use client"; // クライアントコンポーネントとして指定します。

import React, { useEffect, useState, FormEvent, useCallback, use } from "react";
import { useRouter } from "next/navigation"; // Next.jsのルーターフックをインポートします。
import Link from "next/link"; // Next.jsのLinkコンポーネントをインポートします。
import { useAuth } from "@/hooks/useAuth"; // useAuth フックをインポートします。

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
          setError("認証が必要です。ログインしてください。");
          router.push("/");
          return;
        }
        // その他のAPIエラーの場合、エラーをスローします。
        throw new Error(`投稿の取得に失敗しました: ${res.statusText}`);
      }
      const data = await res.json(); // レスポンスデータをJSONとしてパース
      setPost(data);                  // 投稿データを状態に設定
      setLikeCount(data._count.likes); // いいねの数を設定
    } catch (err) {
      // エラーが発生した場合、エラーメッセージを設定し、コンソールにエラーを出力します。
      setError(err instanceof Error ? err.message : "投稿の取得中にエラーが発生しました。");
      console.error("投稿の取得エラー:", err);
    } finally {
      setLoading(false); // ローディング状態を終了
    }
  }, [id, router]); // idとrouterが変更された場合にのみ関数を再作成

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
          console.log("[LikesStatus API] ログインが必要か、ユーザーIDが不一致です。");
          setIsLiked(false); // いいね状態をfalseに設定
          return;
        }
        // その他のAPIエラーの場合、コンソールにエラーを出力し、いいね状態をfalseに設定します。
        console.error("いいね状態の取得に失敗しました:", res.statusText);
        setIsLiked(false);
        return;
      }
      const data = await res.json(); // レスポンスデータをJSONとしてパース
      setIsLiked(data.isLiked);     // いいね状態を更新
    } catch (err) {
      // エラーが発生した場合、コンソールにエラーを出力し、いいね状態をfalseに設定します。
      console.error("いいね状態の確認エラー:", err);
      setIsLiked(false);
    }
  }, [id, user]); // userが変更された場合にのみ関数を再作成

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
        throw new Error(`コメントの取得に失敗しました: ${res.statusText}`);
      }
      const data = await res.json(); // レスポンスデータをJSONとしてパース
      setComments(data);             // コメントリストを状態に設定
    } catch (err) {
      // エラーが発生した場合、コンソールにエラーを出力し、エラーメッセージを設定します。
      console.error("コメントの取得エラー:", err);
      setError(err instanceof Error ? err.message : "コメントの取得中にエラーが発生しました。");
    } finally {
      setCommentLoading(false); // コメントローディング状態を終了
    }
  }, [id]); // idが変更された場合にのみ関数を再作成

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
  }, [userKey, authLoading, fetchPost, fetchComments, checkLikeStatus, user]); // userKeyを依存性配列に追加してユーザー変更時に再実行

  // ✅ いいね状態のみを確認する別の useEffect (ユーザー情報が変更された際に特に重要)
  // これにより、user.id の変化に敏感に反応し、最新のいいね状態を反映させます。
  useEffect(() => {
    if (!authLoading && user && user.id) {
      checkLikeStatus();
    }
  }, [user?.id, authLoading, checkLikeStatus]); // user.id, authLoading, checkLikeStatus が変更された場合に実行

  // 投稿を削除するハンドラー
  const handleDelete = async () => {
    // ログインユーザーが投稿の作成者でない場合、警告を表示して処理を中断します。
    if (!user || user.id !== post?.userId) {
      alert("この投稿を削除する権限がありません。");
      return;
    }
    // 削除確認のダイアログを表示します。
    if (!confirm("本当にこの投稿を削除しますか？")) {
      return;
    }

    try {
      const token = getToken(); // トークンを取得
      if (!token) {
        alert("認証が必要です。");
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
          alert("認証が必要です。");
          router.push("/");
          return;
        }
        // その他のAPIエラーの場合、エラーをスローします。
        throw new Error(`投稿の削除に失敗しました: ${res.statusText}`);
      }
      alert("投稿が削除されました。"); // 削除成功メッセージ
      router.push("/blog"); // 投稿一覧ページにリダイレクト
    } catch (err) {
      // エラーが発生した場合、アラートとコンソールにエラーを出力します。
      alert(`投稿の削除中にエラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
      console.error("投稿の削除エラー:", err);
    }
  };

  // いいねをトグルするハンドラー (いいねのON/OFFを切り替える)
  const handleLikeToggle = async () => {
    try {
      const token = getToken(); // トークンを取得
      if (!token) {
        console.error("トークンが見つかりません。");
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
          console.error("認証エラー: トークンが無効です。");
          return;
        }
        // その他のAPIエラーの場合、エラーをスローします。
        throw new Error(`いいねの操作に失敗しました: ${res.statusText}`);
      }

      const data = await res.json(); // レスポンスデータをJSONとしてパース
      setIsLiked(data.isLiked);     // いいね状態を更新
      setLikeCount((prev) => (data.isLiked ? prev + 1 : prev - 1)); // いいね数も更新

    } catch (err) {
      // エラーが発生した場合、コンソールとアラートにエラーを出力します。
      console.error("いいね操作エラー:", err);
      alert(`いいねの操作中にエラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
    }
  };

  // 新しいコメントを送信するハンドラー
  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault(); // フォームのデフォルト送信を防ぎます。
    // コメント内容が空の場合、警告を表示して処理を中断します。
    if (!newCommentContent.trim()) {
      alert("コメント内容は空にできません。");
      return;
    }

    setCommentLoading(true); // コメント送信ローディング状態を開始
    try {
      const token = getToken(); // トークンを取得
      if (!token) {
        console.error("トークンが見つかりません。");
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
          console.error("認証エラー: トークンが無効です。");
          setCommentLoading(false);
          return;
        }
        // その他のAPIエラーの場合、エラーをスローします。
        throw new Error(`コメントの投稿に失敗しました: ${res.statusText}`);
      }

      setNewCommentContent(""); // コメント入力フィールドをクリア
      await fetchComments();    // コメントリストを最新の状態に更新
      // コメントが正常に投稿されたことへのアラートなどは不要。

    } catch (err) {
      // エラーが発生した場合、コンソールとアラートにエラーを出力します。
      console.error("コメント投稿エラー:", err);
      alert(`コメントの投稿中にエラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
    } finally {
      setCommentLoading(false); // コメント送信ローディング状態を終了
    }
  };

  // ✅ コメント削除ハンドラー (本人が作成したコメントのみ削除可能)
  const handleCommentDelete = async (commentId: string) => {
    // 削除確認のダイアログを表示します。
    if (!confirm("本当にこのコメントを削除しますか？")) {
      return;
    }

    try {
      const token = getToken(); // トークンを取得
      if (!token) {
        alert("認証が必要です。");
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
          alert("認証が必要です。");
          return;
        }
        if (res.status === 403) { // 権限なしエラー (Forbidden)
          alert("このコメントを削除する権限がありません。");
          return;
        }
        // その他のAPIエラーの場合、エラーをスローします。
        throw new Error(`コメントの削除に失敗しました: ${res.statusText}`);
      }

      // 削除成功時にコメントリストを更新
      await fetchComments();
      alert("コメントが削除されました。"); // 削除成功メッセージ

    } catch (err) {
      // エラーが発生した場合、コンソールとアラートにエラーを出力します。
      console.error("コメント削除エラー:", err);
      alert(`コメントの削除中にエラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
    }
  };

  // ローディング中の表示
  if (loading || authLoading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  // エラー発生時の表示
  if (error) {
    return <div className="text-center text-red-500 py-8">エラー: {error}</div>;
  }

  // 投稿が見つからない場合の表示
  if (!post) {
    return <div className="text-center py-8">投稿が見つかりませんでした。</div>;
  }

  // ✅ 現在のユーザーが投稿の作成者であるかを確認 (UIの再レンダリングを保証)
  const isPostOwner = user && user.id === post.userId;

  // コンポーネントのレンダリング
  return (
    // ✅ userKey を key プロパティとして使用し、ユーザーが変更された場合にコンポーネントを強制的に再レンダリングします。
    <div className="container mx-auto p-4" key={userKey}>
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">{post.title}</h1>
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
                target.alt = "画像読み込みエラー"; // 代替テキストを設定
              }}
            />
          </div>
        )}
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-6">{post.content}</p>
        <div className="flex justify-between items-center text-sm text-gray-500 border-t pt-4">
          <span>作成者: {post.username}</span>
          <span>投稿日: {new Date(post.createdAt).toLocaleDateString()}</span>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLikeToggle} // いいねトグルハンドラーを呼び出し
              className={`flex items-center text-lg ${isLiked ? 'text-red-500' : 'text-gray-400'} hover:text-red-600 transition-colors`}
              aria-label={isLiked ? "いいねを取り消す" : "いいねする"} // アクセシビリティのためのラベル
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
              編集
            </Link>
            <button
              onClick={handleDelete} // 削除ハンドラーを呼び出し
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              削除
            </button>
          </div>
        )}
      </div>

      {/* コメントセクション */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">コメント ({comments.length})</h2>

        {/* 新しいコメント投稿フォーム */}
        <form onSubmit={handleCommentSubmit} className="mb-6">
          <textarea
            value={newCommentContent} // コメント内容の状態にバインド
            onChange={(e) => setNewCommentContent(e.target.value)} // 入力値の変更を更新
            placeholder="コメントを入力してください..."
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
            required // 必須入力
            disabled={commentLoading} // コメント送信中は無効化
          ></textarea>
          <button
            type="submit"
            className="mt-3 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={commentLoading || !newCommentContent.trim()} // ローディング中または内容が空の場合はボタンを無効化
          >
            {commentLoading ? "送信中..." : "コメントを投稿"}
          </button>
        </form>

        {/* コメントリスト */}
        {commentLoading && comments.length === 0 ? (
          <div className="text-center text-gray-500">コメントを読み込み中...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-gray-500">まだコメントはありません。</div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800">{comment.user.name || 'Unknown User'}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>

                {/* ✅ コメント削除ボタン - 本人のコメントのみ表示 - 強化された条件付きレンダリング */}
                {user && user.id === comment.userId && (
                  <div className="mt-2 text-right">
                    <button
                      onClick={() => handleCommentDelete(comment.id)} // コメント削除ハンドラーを呼び出し
                      className="text-sm text-red-500 hover:text-red-700 hover:underline transition-colors px-2 py-1 border border-red-300 rounded"
                    >
                      削除
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
          ← 投稿一覧に戻る
        </Link>
      </div>
    </div>
  );
}