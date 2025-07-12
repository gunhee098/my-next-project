// 📂 app/blog/[id]/page.tsx

"use client"; // クライアントコンポーネントとして指定

import React, { useEffect, useState, FormEvent, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth"; // useAuth フック インポート

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
    likes: number;
    comments: number;
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
    id: string; // コメント作成者のuser オブジェクトのID
    name: string; // コメント作成者名
  };
}

// プロップスの型定義 (paramsオブジェクトを含む) - Next.js 15 対応
interface PostDetailPageProps {
  params: Promise<{
    id: string; // 投稿ID
  }>;
}

// localStorage 安全に使用するヘルパー関数
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null; // サーバーサイドレンダリング時はwindow オブジェクトがない
  return localStorage.getItem('token');
};

// PostDetailPage コンポーネント
export default function PostDetailPage({ params }: PostDetailPageProps) {
  // ✅ Next.js 15 対応: React.use()を使用してparams Promiseをunwrap
  const { id } = use(params);

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(0);

  // コメント関連のステート
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentContent, setNewCommentContent] = useState<string>("");
  const [commentLoading, setCommentLoading] = useState<boolean>(false);

  const { user, loading: authLoading, checkAuth } = useAuth(); // useAuth フックからuser 情報を取得
  const router = useRouter();

  // 投稿データを取得する関数
  const fetchPost = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        router.push("/"); // ✅ /auth の代わりにルート(/)にリダイレクト (ログインページ)
        return;
      }
      const res = await fetch(`/api/posts/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError("認証が必要です。ログインしてください。");
          router.push("/");
          return;
        }
        throw new Error(`投稿の取得に失敗しました: ${res.statusText}`);
      }
      const data = await res.json();
      setPost(data);
      setLikeCount(data._count.likes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "投稿の取得中にエラーが発生しました。");
      console.error("投稿の取得エラー:", err);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  // いいね状態を確認する関数 - エラー処理改善
  const checkLikeStatus = useCallback(async () => {
    // ✅ user オブジェクトがnull またはuser.id がない場合は即座にreturn (undefined 問題解決)
    if (!user || !user.id) {
      setIsLiked(false);
      return;
    }

    try {
      const token = getToken();
      if (!token) return;
      // ✅ user.id をクエリパラメータとして安全に送信
      const res = await fetch(`/api/likes/status?postId=${id}&userId=${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        // 403 Forbidden エラー処理改善
        if (res.status === 403) {
          console.log("[LikesStatus API] ログインが必要またはユーザーID不一致。");
          setIsLiked(false);
          return;
        }
        console.error("いいね状態の取得に失敗しました:", res.statusText);
        setIsLiked(false);
        return;
      }
      const data = await res.json();
      setIsLiked(data.isLiked);
    } catch (err) {
      console.error("いいね状態の確認エラー:", err);
      setIsLiked(false);
    }
  }, [id, user]); // 依存配列にuser を追加

  // コメントリストを取得する関数
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
        throw new Error(`コメントの取得に失敗しました: ${res.statusText}`);
      }
      const data = await res.json();
      setComments(data);
    } catch (err) {
      console.error("コメントの取得エラー:", err);
      setError(err instanceof Error ? err.message : "コメントの取得中にエラーが発生しました。");
    } finally {
      setCommentLoading(false);
    }
  }, [id]);

  // 初期ロードとユーザーや投稿IDが変更された際のデータfetch
  useEffect(() => {
    fetchPost();
    // user とauthLoading 状態を基にcheckLikeStatus を呼び出し
    // user が存在しauthLoading でない場合のみ呼び出してuserIp undefined 問題を防止
    if (user && !authLoading) {
      checkLikeStatus();
    }
    fetchComments();
  }, [id, user, authLoading, fetchPost, checkLikeStatus, fetchComments]);

  // 投稿を削除するハンドラー
  const handleDelete = async () => {
    if (!user || user.id !== post?.userId) {
      alert("この投稿を削除する権限がありません。");
      return;
    }
    if (!confirm("本当にこの投稿を削除しますか？")) {
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        alert("認証が必要です。");
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
          alert("認証が必要です。");
          router.push("/");
          return;
        }
        throw new Error(`投稿の削除に失敗しました: ${res.statusText}`);
      }
      alert("投稿が削除されました。");
      router.push("/blog");
    } catch (err) {
      alert(`投稿の削除中にエラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
      console.error("投稿の削除エラー:", err);
    }
  };

  // いいねをトグルするハンドラー
  const handleLikeToggle = async () => {
    try {
      const token = getToken();
      if (!token) {
        console.error("トークンが見つかりません");
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
          console.error("認証エラー: トークンが無効です");
          return;
        }
        throw new Error(`いいねの操作に失敗しました: ${res.statusText}`);
      }

      const data = await res.json();
      setIsLiked(data.isLiked);
      setLikeCount((prev) => (data.isLiked ? prev + 1 : prev - 1));

    } catch (err) {
      console.error("いいね操作エラー:", err);
      alert(`いいねの操作中にエラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
    }
  };

  // 新しいコメントを送信するハンドラー
  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCommentContent.trim()) {
      alert("コメント内容は空にできません。");
      return;
    }

    setCommentLoading(true);
    try {
      const token = getToken();
      if (!token) {
        console.error("トークンが見つかりません");
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
          console.error("認証エラー: トークンが無効です");
          setCommentLoading(false);
          return;
        }
        throw new Error(`コメントの投稿に失敗しました: ${res.statusText}`);
      }

      setNewCommentContent("");
      await fetchComments(); // コメントリストを更新

    } catch (err) {
      console.error("コメント投稿エラー:", err);
      alert(`コメントの投稿中にエラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
    } finally {
      setCommentLoading(false);
    }
  };

  // ✅ コメント削除ハンドラー (本人が作成したコメントのみ削除可能)
  const handleCommentDelete = async (commentId: string) => {
    if (!confirm("本当にこのコメントを削除しますか？")) {
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        alert("認証が必要です。");
        return;
      }

      const res = await fetch(`/api/comments/${commentId}`, { // DELETE リクエスト
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          alert("認証が必要です。");
          return;
        }
        if (res.status === 403) { // 権限なしエラー
          alert("このコメントを削除する権限がありません。");
          return;
        }
        throw new Error(`コメントの削除に失敗しました: ${res.statusText}`);
      }

      // 削除成功時にコメントリストを更新
      await fetchComments();
      alert("コメントが削除されました。");

    } catch (err) {
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

  // コンポーネントのレンダリング
  return (
    <div className="container mx-auto p-4">
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">{post.title}</h1>
        {post.imageUrl && (
          <div className="mb-4">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-auto max-h-96 object-contain rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "/placeholder-image.png";
                target.alt = "画像読み込みエラー";
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
              onClick={handleLikeToggle}
              className={`flex items-center text-lg ${isLiked ? 'text-red-500' : 'text-gray-400'} hover:text-red-600 transition-colors`}
              aria-label={isLiked ? "いいねを取り消す" : "いいねする"}
            >
              ❤️ <span className="ml-1 text-sm">{likeCount}</span>
            </button>
            <span className="flex items-center text-lg text-gray-500">
              💬 <span className="ml-1 text-sm">{comments.length}</span>
            </span>
          </div>
        </div>

        {/* 投稿者のみ編集・削除ボタン表示 */}
        {user && user.id === post.userId && (
          <div className="mt-6 flex space-x-4 justify-end">
            <Link
              href={`/blog/${id}/edit`}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              編集
            </Link>
            <button
              onClick={handleDelete}
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
            value={newCommentContent}
            onChange={(e) => setNewCommentContent(e.target.value)}
            placeholder="コメントを入力してください..."
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
            required
            disabled={commentLoading}
          ></textarea>
          <button
            type="submit"
            className="mt-3 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={commentLoading || !newCommentContent.trim()}
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

                {/* コメント削除ボタン - 本人のコメントのみ表示 */}
                {user && user.id === comment.userId && (
                  <div className="mt-2 text-right">
                    <button
                      onClick={() => handleCommentDelete(comment.id)}
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