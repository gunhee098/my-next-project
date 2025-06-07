"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// 投稿編集ページコンポーネント
// 特定のIDを持つ投稿の詳細を取得し、編集フォームを提供します。
export default function EditPost() {
  const router = useRouter(); // Next.jsルーターフックを初期化
  const params = useParams(); // URLパラメータから投稿IDを取得
  const postId = params.id as string; // 投稿IDを文字列として抽出

  // 編集フォームのタイトルと内容を管理するstate
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // コンポーネントがマウントされた時、またはpostIdが変更された時に投稿データを取得
  useEffect(() => {
    const fetchPost = async () => {
      console.log("🔄 編集する投稿データを読み込み中...");
      // APIから指定されたIDの投稿データを取得
      const res = await fetch(`/api/posts/${postId}`);
      if (!res.ok) {
        // 投稿が見つからない場合のエラーハンドリング
        console.error("⚠ 投稿が見つかりません。");
        router.replace("/blog"); // 投稿がない場合はブログ一覧ページへリダイレクト
        return;
      }
      const data = await res.json(); // 応答データをJSONとしてパース
      setTitle(data.title); // 取得したタイトルをstateに設定
      setContent(data.content); // 取得した内容をstateに設定
      console.log("✅ 投稿の読み込みが完了しました:", data);
    };

    // postIdが有効な場合にのみ投稿データ取得関数を呼び出す
    if (postId) {
      fetchPost();
    }
  }, [postId, router]); // postIdとrouterが変更された場合にeffectを再実行

  // 投稿更新処理ハンドラー
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); // デフォルトのフォーム送信動作を防止
    console.log(`🔧 更新リクエスト: ${postId}`);

    const token = localStorage.getItem("token"); // ローカルストレージからJWTトークンを取得
    if (!token) {
      alert("ログインが必要です！"); // トークンがない場合は警告
      return;
    }

    // APIエンドポイントにPUTリクエストを送信して投稿を更新
    // IDはURLパスパラメータとして渡され、リクエストボディにはタイトルと内容のみを含めます。
    const res = await fetch(`/api/posts/${postId}`, {
      method: "PUT", // HTTPメソッドはPUT
      headers: {
        "Content-Type": "application/json", // リクエストボディの形式はJSON
        "Authorization": `Bearer ${token}` // JWTトークンをAuthorizationヘッダーに含める
      },
      body: JSON.stringify({ title, content }), // 更新するタイトルと内容
    });

    console.log("サーバー応答:", res.status); // サーバーからの応答ステータスをログ出力

    if (res.ok) {
      alert("更新が完了しました！"); // 更新成功メッセージ
      router.push(`/blog`); // 更新後、ブログ一覧ページへリダイレクト
    } else {
      const errorData = await res.json(); // サーバーからのエラー応答をJSONとしてパース
      // サーバーからのエラーメッセージがある場合はそれを使用し、ない場合は一般的なメッセージを表示
      alert(`更新失敗: ${errorData.error || '不明なエラー'}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold">投稿を編集</h1>
      <form onSubmit={handleUpdate} className="mt-4 space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2 rounded"
          placeholder="タイトル"
          required // 必須フィールド
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full border p-2 rounded"
          placeholder="内容"
          required // 必須フィールド
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          更新を完了
        </button>
      </form>
    </div>
  );
}