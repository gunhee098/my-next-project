"use client"; // このファイルがクライアントサイドで実行されることを宣言

import { useState } from "react";
import { useRouter } from "next/navigation"; // ルーティング管理のためのuseRouterをインポート
import { useLang } from "@/components/LanguageProvider"; // LanguageProviderから言語コンテキストフックをインポート (エイリアスパス使用)
import en from "@/locales/en.json"; // 英語の辞書ファイルをインポート (エイリアスパス使用)
import ja from "@/locales/ja.json"; // 日本語の辞書ファイルをインポート (エイリアスパス使用)

// 新規投稿ページコンポーネント
// ユーザーが新しいブログ投稿を作成するためのインターフェースを提供します。
export default function NewPostPage() {
  const router = useRouter(); // Next.jsのルーターフックを初期化

  // 投稿タイトルを管理するstate
  const [title, setTitle] = useState("");
  // 投稿内容を管理するstate
  const [content, setContent] = useState("");
  // 💡 追加: 選択されたファイルと画像プレビュー用state
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // 💡 追加: ローディング状態を管理するstate
  const [loading, setLoading] = useState(false);
  // 💡 追加: エラーメッセージを管理するstate
  const [error, setError] = useState<string | null>(null);

  // 言語コンテキストから現在の言語 (lang) と設定関数 (setLang) を取得
  const { lang, setLang } = useLang();
  // 現在の言語に基づいて使用する辞書オブジェクトを選択
  const dict = lang === "ja" ? ja : en;

  // 💡 追加: ファイルが選択された時のハンドラー
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile); // ファイルをstateに保存

      // 画像プレビューを生成
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

  // 投稿作成処理を行う非同期ハンドラー関数 (handleSubmitに名称変更)
  const handleSubmit = async (e: React.FormEvent) => { // e: React.FormEvent を引数に追加
    e.preventDefault(); // フォームのデフォルト送信を防ぐ

    setLoading(true); // ロード開始
    setError(null); // エラーリセット

    let imageUrl: string | undefined; // Cloudinaryから取得する画像URLを格納する変数

    try {
      // 💡 変更点: ファイルが選択されていれば先に画像をCloudinaryにアップロード
      if (file) {
        console.log("画像をCloudinaryにアップロード中...");
        const formData = new FormData();
        formData.append("file", file); // 'file'という名前でファイルをフォームデータに追加

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData, // FormDataを直接送信
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
        method: "POST", // HTTPメソッドはPOST
        headers: {
          "Content-Type": "application/json", // リクエストボディの形式はJSON
          Authorization: `Bearer ${token}`, // 認証ヘッダーにJWTトークンを含める
        },
        // 💡 変更点: imageUrl があればリクエストボディに含める
        body: JSON.stringify({ title, content, image_url: imageUrl }),
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
      setFile(null); // 💡 追加
      setImagePreview(null); // 💡 追加
      // 投稿一覧ページへリダイレクト
      router.push("/blog");
    } catch (err: any) { // エラーの型を any に指定
      // エラー発生時の処理 (多言語対応メッセージを使用し、エラー詳細もコンソールに出力)
      console.error(dict.postFail, err); // err.message 대신 err를 직접 로깅하여 자세한 오류 확인
      setError(err.message || dict.postFail); // ユーザー向けにはエラーメッセージを表示
    } finally {
      setLoading(false); // ロード終了
    }
  };

  return (
    // ページ全体のコンテナ。中央寄せ、パディング、相対位置指定
    <div className="max-w-2xl mx-auto p-4 relative">
      {/* 言語切り替えボタン - 右上固定 */}
      <div className="absolute top-4 right-4">
        <div className="inline-flex shadow rounded overflow-hidden">
          {/* 英語切り替えボタン */}
          <button
            onClick={() => setLang("en")}
            className={`px-3 py-1 font-medium ${
              lang === "en" ? "bg-blue-600 text-white" : "bg-gray-200 text-black"
            }`}
          >
            EN
          </button>
          {/* 日本語切り替えボタン */}
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

      {/* ページタイトル (辞書から取得) */}
      <h1 className="text-2xl font-bold mb-4 text-center">{dict.newPostTitle}</h1>

      <form onSubmit={handleSubmit} className="space-y-4"> {/* 💡 変更点: form 태그 추가 및 onSubmit 핸들러 연결 */}
        {/* タイトル入力フィールド (プレースホルダーも辞書から取得) */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            {dict.titlePlaceholder}
          </label>
          <input
            type="text"
            id="title"
            placeholder={dict.titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required // 💡 追加: 必須フィールド
            className="mt-1 block w-full border p-2 rounded-md shadow-sm"
            disabled={loading} // 💡 追加: ローディング中は無効化
          />
        </div>

        {/* 内容入力テキストエリア (プレースホルダーも辞書から取得) */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">
            {dict.contentPlaceholder}
          </label>
          <textarea
            id="content"
            placeholder={dict.contentPlaceholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required // 💡 追加: 必須フィールド
            rows={8} // 高さ指定
            className="mt-1 block w-full border p-2 rounded-md shadow-sm"
            disabled={loading} // 💡 追加: ローディング中は無効化
          ></textarea>
        </div>

        {/* 💡 追加: 画像アップロードフィールド */}
        <div>
          <label htmlFor="image" className="block text-sm font-medium text-gray-700">
            画像 (オプション)
          </label>
          <input
            type="file"
            id="image"
            accept="image/*" // 画像ファイルのみ受け付ける
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={loading} // 💡 追加: ローディング中は無効化
          />
          {imagePreview && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">画像プレビュー:</p>
              <img src={imagePreview} alt="画像プレビュー" className="max-w-xs h-auto rounded-lg shadow-md" />
            </div>
          )}
        </div>

        {/* 💡 追加: エラーメッセージ表示 */}
        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}

        {/* 投稿作成ボタン (テキストも辞書から取得) */}
        <button
          type="submit" // 💡 変更点: type="submit"으로 변경 (form 태그와 함께 사용)
          className="bg-blue-500 text-white px-4 py-2 mt-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          disabled={loading} // 💡 追加: 로딩 중에는 버튼 비활성화
        >
          {loading ? "作成中..." : dict.createPost}
        </button>
      </form> {/* 💡 変更点: form 태그 닫기 */}
    </div>
  );
}