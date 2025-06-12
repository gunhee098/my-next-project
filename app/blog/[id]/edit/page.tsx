"use client"; // このファイルがクライアントサイドで実行されることを宣言

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation"; // ルーティング管理のためのuseRouter, useParamsをインポート
import { useLang } from "@/components/LanguageProvider"; // LanguageProviderから言語コンテキストフックをインポート
import en from "@/locales/en.json"; // 英語の辞書ファイルをインポート
import ja from "@/locales/ja.json"; // 日本語の辞書ファイルをインポート

// 投稿編集ページコンポーネント
// 特定のIDを持つ投稿の詳細を取得し、編集フォームを提供します。
export default function EditPost() {
  const router = useRouter(); // Next.jsルーターフックを初期化
  const params = useParams(); // URLパラメータから投稿IDを取得
  const postId = params.id as string; // 投稿IDを文字列として抽出

  // 編集フォームのタイトルと内容を管理するstate
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  // 💡 追加: 既存の画像URLを管理するstate (DBから取得)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  // 💡 追加: 選択された新しいファイルと画像プレビュー用state
  const [newFile, setNewFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null); // 新しいファイルのプレビューまたは既存の画像

  // ローディング状態とエラー状態
  const [loading, setLoading] = useState(true); // 初期ロードはtrue
  const [error, setError] = useState<string | null>(null);

  // 言語コンテキスト
  const { lang, setLang } = useLang();
  const dict = lang === "ja" ? ja : en;

  // コンポーネントがマウントされた時、またはpostIdが変更された時に投稿データを取得
  useEffect(() => {
    const fetchPost = async () => {
      console.log("🔄 編集する投稿データを読み込み中...");
      try {
        // APIから指定されたIDの投稿データを取得
        const res = await fetch(`/api/posts/${postId}`);
        if (!res.ok) {
          // 投稿が見つからない場合のエラーハンドリング
          console.error("⚠ 投稿が見つかりません。");
          throw new Error(dict.fetchPostFail); // エラーメッセージをスロー
        }
        const data = await res.json(); // 応答データをJSONとしてパース
        setTitle(data.title); // 取得したタイトルをstateに設定
        setContent(data.content); // 取得した内容をstateに設定
        // 💡 追加: 既存の画像URLをstateにセットし、画像プレビューの初期値とする
        if (data.image_url) {
          setExistingImageUrl(data.image_url);
          setImagePreview(data.image_url); // 既存の画像を初期プレビューとして表示
        }
        console.log("✅ 投稿の読み込みが完了しました:", data);
      } catch (err: any) {
        console.error("投稿の読み込み中にエラーが発生しました:", err);
        setError(err.message || dict.fetchPostFail);
        router.replace("/blog"); // エラー時はブログ一覧ページへリダイレクト
      } finally {
        setLoading(false); // ロード終了
      }
    };

    // postIdが有効な場合にのみ投稿データ取得関数を呼び出す
    if (postId) {
      fetchPost();
    }
  }, [postId, router, dict]); // postId, router, dict が変更された場合にeffectを再実行

  // 💡 追加: 新しいファイルが選択された時のハンドラー
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setNewFile(selectedFile); // 新しいファイルをstateに保存

      // 新しい画像のプレビューを生成
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setNewFile(null);
      // ファイル選択がキャンセルされた場合、既存の画像があればそれをプレビューに戻す
      setImagePreview(existingImageUrl);
    }
  };

  // 投稿更新処理ハンドラー
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); // デフォルトのフォーム送信動作を防止
    console.log(`🔧 更新リクエスト: ${postId}`);

    setLoading(true); // ロード開始
    setError(null); // エラーリセット

    let newImageUrl: string | undefined = existingImageUrl || undefined; // デフォルトは既存の画像URL

    try {
      // 💡 変更点: 新しいファイルが選択されていれば、Cloudinaryにアップロード
      if (newFile) {
        console.log("新しい画像をCloudinaryにアップロード中...");
        const formData = new FormData();
        formData.append("file", newFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.error || "画像のアップロードに失敗しました。");
        }

        const uploadResult = await uploadRes.json();
        newImageUrl = uploadResult.imageUrl; // Cloudinaryから返された新しい画像URLを取得
        console.log("新しい画像アップロード成功:", newImageUrl);
      }

      const token = localStorage.getItem("token"); // ローカルストレージからJWTトークンを取得
      if (!token) {
        throw new Error(dict.needLogin); // トークンがない場合はエラー
      }

      // APIエンドポイントにPUTリクエストを送信して投稿を更新
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT", // HTTPメソッドはPUT
        headers: {
          "Content-Type": "application/json", // リクエストボディの形式はJSON
          "Authorization": `Bearer ${token}` // JWTトークンをAuthorizationヘッダーに含める
        },
        // 💡 変更点: 新しい画像URLを含める
        body: JSON.stringify({ title, content, image_url: newImageUrl }), // 更新するタイトルと内容
      });

      console.log("サーバー応答:", res.status); // サーバーからの応答ステータスをログ出力

      if (res.ok) {
        alert(dict.updateSuccess); // 更新成功メッセージ
        router.push(`/blog`); // 更新後、投稿詳細ページへリダイレクト
      } else {
        const errorData = await res.json(); // サーバーからのエラー応答をJSONとしてパース
        // サーバーからのエラーメッセージがある場合はそれを使用し、ない場合は一般的なメッセージを表示
        throw new Error(errorData.error || dict.updateFail);
      }
    } catch (err: any) {
      console.error("投稿更新または画像アップロード中にエラーが発生しました:", err);
      setError(err.message || dict.updateFail);
    } finally {
      setLoading(false); // ロード終了
    }
  };

  // 初期ロード中の表示
  if (loading) {
    return <div className="text-center py-8">{dict.loading}</div>;
  }

  // エラー発生時の表示
  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 relative">
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

      <h1 className="text-2xl font-bold mb-4 text-center">{dict.editPostTitle}</h1> {/* 辞書からタイトル取得 */}

      <form onSubmit={handleUpdate} className="mt-4 space-y-4">
        {/* タイトル入力フィールド */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            {dict.titlePlaceholder}
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border p-2 rounded-md shadow-sm"
            placeholder={dict.titlePlaceholder}
            required
            disabled={loading}
          />
        </div>

        {/* 内容入力フィールド */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">
            {dict.contentPlaceholder}
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border p-2 rounded-md shadow-sm h-40"
            placeholder={dict.contentPlaceholder}
            required
            disabled={loading}
          ></textarea>
        </div>

        {/* 💡 追加: 画像アップロードフィールドとプレビュー */}
        <div>
          <label htmlFor="image" className="block text-sm font-medium text-gray-700">
            画像 (オプション)
          </label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={loading}
          />
          {imagePreview && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">画像プレビュー:</p>
              <img src={imagePreview} alt="画像プレビュー" className="max-w-xs h-auto rounded-lg shadow-md" />
            </div>
          )}
          {/* 💡 追加:既存の画像URLがある場合、 */}
          {!newFile && existingImageUrl && ( // 新しいファイルが選択されていない場合のみ表示
              <div className="mt-2 text-sm text-gray-500">
                  現在の画像: <a href={existingImageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">表示</a>
              </div>
          )}
        </div>

        {/* エラーメッセージ表示 */}
        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}

        {/* 更新ボタン */}
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          disabled={loading}
        >
          {loading ? "更新中..." : dict.updatePost}
        </button>
      </form>
    </div>
  );
}