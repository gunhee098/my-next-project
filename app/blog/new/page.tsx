// 📂 app/blog/new/page.tsx
"use client"; // このファイルがクライアントサイドで実行されることを宣言

import { useState } from "react";
import { useRouter } from "next/navigation"; // ルーティング管理のためのuseRouterをインポート
import { useLang } from "@/components/LanguageProvider"; // LanguageProviderから言語コンテキストフックをインポート (エイリアスパス使用)
import { useTheme } from "@/components/ThemeProvider"; // 💡 追加: ThemeProviderからテーマコンテキストフックをインポート
import en from "@/locales/en.json"; // 英語の辞書ファイルをインポート (エイリアスパス使用)
import ja from "@/locales/ja.json"; // 日本語の辞書ファイルをインポート (エイリアスパス使用)

/**
 * 新規投稿ページコンポーネント
 * ユーザーが新しいブログ投稿を作成するためのインターフェースを提供します。
 * 画像アップロード機能と多言語対応、テーマ切り替えに対応します。
 */
export default function NewPostPage() {
  const router = useRouter(); // Next.jsのルーターフックを初期化

  // 投稿タイトルを管理するstate
  const [title, setTitle] = useState("");
  // 投稿内容を管理するstate
  const [content, setContent] = useState("");
  // 選択されたファイルと画像プレビュー用state
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // ローディング状態を管理するstate
  const [loading, setLoading] = useState(false);
  // エラーメッセージを管理するstate
  const [error, setError] = useState<string | null>(null);

  // 言語コンテキストから現在の言語 (lang) と設定関数 (setLang) を取得
  const { lang, setLang } = useLang();
  // 現在の言語に基づいて使用する辞書オブジェクトを選択
  const dict = lang === "ja" ? ja : en;

  // 💡 追加: テーマコンテキストから現在のテーマ (theme) を取得
  const { theme } = useTheme();

  /**
   * ファイルが選択された時のハンドラー
   * 選択されたファイルをstateに保存し、画像プレビューを生成します。
   * @param {React.ChangeEvent<HTMLInputElement>} e - ファイル入力イベント
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFile(null);
      setImagePreview(null);
    }
  };

  /**
   * 投稿作成処理を行うフォーム送信ハンドラー
   * 画像のアップロードと投稿データの送信を非同期で行います。
   * @param {React.FormEvent} e - フォーム送信イベント
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // フォームのデフォルト送信を防ぐ

    setLoading(true); // ロード開始
    setError(null); // エラーメッセージをリセット

    let imageUrl: string | undefined; // Cloudinaryから取得する画像URLを格納する変数

    try {
      // ファイルが選択されていれば先に画像をCloudinaryにアップロード
      if (file) {
        console.log("画像をCloudinaryにアップロード中...");
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.error || "画像のアップロードに失敗しました。");
        }

        const uploadResult = await uploadRes.json();
        imageUrl = uploadResult.imageUrl; // Cloudinaryから返された画像URLを取得
        console.log("画像アップロード成功:", imageUrl);
      }

      // JWTトークンをローカルストレージから取得
      const token = localStorage.getItem("token");
      // トークンが存在しない場合、エラーをスロー (多言語対応メッセージを使用)
      if (!token) throw new Error(dict.needLogin);

      // 新しい投稿データをAPIエンドポイントにPOSTリクエストとして送信
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // 認証ヘッダーにJWTトークンを含める
        },
        body: JSON.stringify({ title, content, image_url: imageUrl }), // imageUrl があればリクエストボディに含める
      });

      // レスポンスが正常でない場合
      if (!res.ok) {
        const errorData = await res.json();
        // サーバーからのエラーメッセージ、またはデフォルトの投稿失敗メッセージを使用
        throw new Error(errorData.error || dict.postFail);
      }

      // 投稿成功後、フォームフィールドと画像関連stateをクリア
      setTitle("");
      setContent("");
      setFile(null);
      setImagePreview(null);
      // 投稿一覧ページへリダイレクト
      router.push("/blog");
    } catch (err: any) { // エラーの型を any に指定
      // エラー発生時の処理 (多言語対応メッセージを使用し、エラー詳細もコンソールに出力)
      console.error(dict.postFail, err);
      setError(err.message || dict.postFail); // ユーザー向けにはエラーメッセージを表示
    } finally {
      setLoading(false); // ロード終了
    }
  };

  return (
    // ページ全体のコンテナ。背景色とテキスト色をテーマに基づいて設定。
    // max-w-2xl mx-auto p-4 relative: 中央寄せ、パディング、相対位置指定
    <div className={`max-w-2xl mx-auto p-4 relative ${theme === 'dark' ? 'dark:bg-gray-800 dark:text-gray-100' : 'bg-white text-gray-900'}`}>
      {/* 言語切り替えボタン - 右上固定 */}
      <div className="absolute top-4 right-4">
        <div className="inline-flex shadow rounded overflow-hidden">
          <button
            onClick={() => setLang("en")}
            className={`px-3 py-1 font-medium ${
              lang === "en" ? "bg-blue-600 text-white" : "bg-gray-200 text-black dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("ja")}
            className={`px-3 py-1 font-medium ${
              lang === "ja" ? "bg-blue-600 text-white" : "bg-gray-200 text-black dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            JP
          </button>
        </div>
      </div>

      {/* ページタイトル (辞書から取得) */}
      <h1 className="text-2xl font-bold mb-4 text-center">{dict.newPostTitle}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* タイトル入力フィールド */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {dict.titlePlaceholder}
          </label>
          <input
            type="text"
            id="title"
            placeholder={dict.titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            // 💡 変更: テーマに応じたスタイル適用
            className="mt-1 block w-full border p-2 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>

        {/* 内容入力テキストエリア */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {dict.contentPlaceholder}
          </label>
          <textarea
            id="content"
            placeholder={dict.contentPlaceholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={8}
            // 💡 変更: テーマに応じたスタイル適用
            className="mt-1 block w-full border p-2 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          ></textarea>
        </div>

        {/* 画像アップロードフィールド */}
        <div>
          <label htmlFor="image" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            画像 (オプション)
          </label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleFileChange}
            // 💡 変更: テーマに応じたスタイル適用
            className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400
                       file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                       file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700
                       dark:file:bg-blue-800 dark:file:text-blue-200
                       hover:file:bg-blue-100 dark:hover:file:bg-blue-700"
            disabled={loading}
          />
          {imagePreview && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">画像プレビュー:</p>
              <img src={imagePreview} alt="画像プレビュー" className="max-w-xs h-auto rounded-lg shadow-md" />
            </div>
          )}
        </div>

        {/* エラーメッセージ表示 */}
        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}

        {/* 投稿作成ボタン */}
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 mt-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? "作成中..." : dict.createPost}
        </button>
      </form>
    </div>
  );
}