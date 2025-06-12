"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// 投稿データのインターフェース定義を更新：image_urlを追加
interface Post {
  id: number;
  title: string;
  content: string;
  userid: number; // 💡 追加: ユーザーID (Post テーブルの userid カラムと一致)
  image_url?: string; // 💡 追加: 画像のURL (オプションプロパティとして定義)
  // 必要に応じて他のプロパティも追加（例: created_at, updated_at など）
}

// 投稿詳細ページコンポーネント
// 特定のIDを持つ単一の投稿を表示し、編集・削除機能へのリンクを提供します。
export default function PostPage({ params }: { params: { id: string } }) {
  const router = useRouter(); // Next.jsルーターフックを初期化
  // 投稿データを管理するstate。初期値はnullです。
  // 💡 変更点: Post インターフェースを使用するように型を更新
  const [post, setPost] = useState<Post | null>(null);
  // ロード中状態を管理するstate。データの読み込み中にUIフィードバックを提供します。
  const [loading, setLoading] = useState(true);
  // エラー状態を管理するstate。データの読み込み失敗時にエラーメッセージを表示します。
  const [error, setError] = useState<string | null>(null);

  // コンポーネントがマウントされた時、またはparams.idが変更された時に投稿データを取得
  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true); // データ読み込み開始
      setError(null); // エラー状態をリセット

      try {
        // APIから指定されたIDの投稿データを取得
        const res = await fetch(`/api/posts/${params.id}`);
        if (!res.ok) {
          // HTTPエラー応答の場合
          const errorData = await res.json();
          setError(errorData.error || "投稿が見つかりません。"); // サーバーからのエラーメッセージ、またはデフォルトメッセージ
          console.error("投稿の読み込みに失敗しました:", errorData);
          router.replace("/blog"); // 投稿がない場合はブログ一覧ページへリダイレクト
          return;
        }
        setPost(await res.json()); // 取得したデータをstateに設定
      } catch (err) {
        // ネットワークエラーなど、リクエスト自体が失敗した場合
        console.error("投稿の読み込み中にネットワークエラーが発生しました:", err);
        setError("投稿の読み込み中にエラーが発生しました。");
        router.replace("/blog"); // エラー発生時はブログ一覧ページへリダイレクト
      } finally {
        setLoading(false); // データ読み込み完了
      }
    };

    fetchPost(); // 投稿データ取得関数を呼び出す
  }, [params.id, router]); // params.idとrouterが変更された場合にeffectを再実行

  // 投稿削除処理ハンドラー
  const handleDelete = async () => {
    // ユーザーに削除確認を求める
    if (!confirm("本当に削除しますか？")) return;

    const token = localStorage.getItem("token"); // ローカルストレージからJWTトークンを取得
    if (!token) {
      alert("ログインが必要です！"); // トークンがない場合は警告
      router.push("/auth/login"); // ログインページへリダイレクト
      return;
    }

    try {
      // APIエンドポイントにDELETEリクエストを送信して投稿を削除
      const res = await fetch(`/api/posts/${params.id}`, {
        method: "DELETE", // HTTPメソッドはDELETE
        headers: {
          "Content-Type": "application/json", // リクエストボディの形式はJSON
          "Authorization": `Bearer ${token}` // JWTトークンをAuthorizationヘッダーに含める
        },
        // DELETEリクエストボディにIDを含める (サーバー側のAPI要件による)
        body: JSON.stringify({ id: parseInt(params.id) })
      });

      if (res.ok) {
        alert("削除されました。"); // 削除成功メッセージ
        router.push("/blog"); // 削除後、ブログ一覧ページへリダイレクト
      } else {
        const errorData = await res.json(); // サーバーからのエラー応答をJSONとしてパース
        // サーバーからのエラーメッセージがある場合はそれを使用し、ない場合は一般的なメッセージを表示
        alert(`削除失敗: ${errorData.error || '不明なエラー'}`);
        console.error("投稿の削除に失敗しました:", errorData);
      }
    } catch (err) {
      console.error("投稿の削除中にネットワークエラーが発生しました:", err);
      alert("削除中にネットワークエラーが発生しました。");
    }
  };

  // 投稿読み込み中の表示
  if (loading) return <p>投稿を読み込み中...</p>;
  // エラー発生時の表示
  if (error) return <p>エラー: {error}</p>;
  // 投稿データが見つからない場合の表示 (loading/errorがfalseでpostがnullの場合)
  if (!post) return <p>投稿が見つかりません。</p>;

  console.log("✅ 投稿データ:", post); // 投稿データをコンソールにログ出力

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold">{post.title}</h1>
      
      {/* 💡 追加: image_url が存在する場合に画像を表示 */}
      {post.image_url && (
        <div className="mt-4">
          <img
            src={post.image_url}
            alt={post.title || "投稿画像"}
            className="w-full h-auto rounded-lg shadow-md object-cover"
            style={{ maxWidth: '100%', maxHeight: '400px' }} // 最大サイズを制限（必要に応じて調整）
          />
        </div>
      )}

      {/* 💡 変更点: content に whitespace-pre-wrap クラスを追加して改行を保持 */}
      <p className="text-gray-600 mt-2 whitespace-pre-wrap">{post.content}</p>

      <div className="mt-4 flex gap-2">
        {/* 投稿編集ページへのボタン */}
        <button
          onClick={() => router.push(`/blog/${params.id}/edit`)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          修正
        </button>
        {/* 投稿削除ボタン */}
        <button
          onClick={handleDelete}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          削除
        </button>
      </div>
    </div>
  );
}