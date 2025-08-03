// 📂 app/blog/[id]/edit/page.tsx
"use client"; // このファイルがクライアントサイドで実行されることを宣言

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation"; // ルーティング管理のためのuseRouterをインポート
import { useLang } from "@/components/LanguageProvider"; // LanguageProviderから言語コンテキストフックをインポート
import { useTheme } from "@/components/ThemeProvider"; // ThemeProviderからテーマコンテキストフックをインポート
import ThemeToggleButton from "@/components/ThemeToggleButton"; // テーマ切り替えボタンコンポーネントをインポート
import en from "@/locales/en.json"; // 英語の辞書ファイルをインポート
import ja from "@/locales/ja.json"; // 日本語の辞書ファイルをインポート

/**
 * 投稿編集ページコンポーネント
 * ユーザーが既存のブログ投稿を編集するためのインターフェースを提供します。
 * 画像の変更・削除機能と多言語対応、テーマ切り替えに対応します。
 */
export default function EditPost() {
  const router = useRouter(); // Next.jsのルーターフックを初期化
  const params = useParams(); // URLパラメータを取得
  const postId = params.id as string; // 投稿IDを文字列として取得
  const fileInputRef = useRef<HTMLInputElement>(null); // ファイル入力参照を追加

  // 投稿タイトルを管理するstate
  const [title, setTitle] = useState("");
  // 投稿内容を管理するstate
  const [content, setContent] = useState("");
  // 既存の画像URLを管理するstate
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  // 新しく選択されたファイルを管理するstate
  const [newFile, setNewFile] = useState<File | null>(null);
  // 画像プレビュー用state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // 画像削除状態を管理するstate（画像が明示的に削除されたかどうか）
  const [isImageRemoved, setIsImageRemoved] = useState(false);

  // ローディング状態を管理するstate
  const [loading, setLoading] = useState(true);
  // エラーメッセージを管理するstate
  const [error, setError] = useState<string | null>(null);

  // 言語コンテキストから現在の言語 (lang) と設定関数 (setLang) を取得
  const { lang, setLang } = useLang();
  // 現在の言語に基づいて使用する辞書オブジェクトを選択
  const dict = lang === "ja" ? ja : en;

  // テーマコンテキストから現在のテーマ (theme) を取得
  const { theme } = useTheme();

  /**
   * コンポーネントマウント時に実行される副作用フック
   * 編集対象の投稿データをAPIから取得します。
   */
  useEffect(() => {
    const fetchPost = async () => {
      console.log("🔄 編集対象の投稿データを読み込み中...");
      try {
        const res = await fetch(`/api/posts/${postId}`);
        if (!res.ok) {
          console.error(`⚠ 投稿取得失敗: ステータス ${res.status}`);
          const errorData = await res.json();
          throw new Error(errorData.error || dict.fetchPostFail);
        }
        const data = await res.json();
        
        setTitle(data.title);
        setContent(data.content);
        
        if (data.imageUrl) {
          setExistingImageUrl(data.imageUrl);
          setImagePreview(data.imageUrl);
        }
        console.log("✅ 投稿データ読み込み完了:", data);
      } catch (err: any) {
        console.error("投稿読み込み中にエラーが発生:", err);
        setError(err.message || dict.fetchPostFail);
        router.replace("/blog");
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPost();
    }
  }, [postId, router, dict]);

  /**
   * ファイルが選択された時のハンドラー
   * 選択されたファイルをstateに保存し、画像プレビューを生成します。
   * @param {React.ChangeEvent<HTMLInputElement>} e - ファイル入力イベント
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setNewFile(selectedFile);
      setIsImageRemoved(false); // 新しいファイル選択時、削除状態をリセット

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  /**
   * 画像を完全に削除する関数
   * 選択されたファイルとプレビューをクリアし、削除状態を設定します。
   */
  const handleImageCancel = () => {
    console.log("🗑️ 画像削除開始");
    
    // 全ての画像関連状態をリセット
    setNewFile(null);
    setImagePreview(null);
    setIsImageRemoved(true); // 画像が削除されたことを示すフラグを設定
    
    // ファイル入力フィールドをリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    console.log("✅ 画像削除完了");
  };

  /**
   * 既存画像を復元する関数
   * 削除状態をリセットし、元の画像を表示します。
   */
  const handleRestoreImage = () => {
    console.log("🔄 既存画像を復元中");
    
    setNewFile(null);
    setImagePreview(existingImageUrl);
    setIsImageRemoved(false);
    
    // ファイル入力フィールドをリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    console.log("✅ 既存画像復元完了");
  };

  /**
   * 投稿更新処理を行うフォーム送信ハンドラー
   * 画像のアップロード（必要な場合）と投稿データの更新を非同期で行います。
   * @param {React.FormEvent} e - フォーム送信イベント
   */
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); // フォームのデフォルト送信を防ぐ
    console.log(`🔧 投稿更新リクエスト開始 (投稿ID: ${postId})`);

    setLoading(true); // ロード開始
    setError(null); // エラーメッセージをリセット

    // 更新する画像URLを決定
    let updatedImageUrl: string | null | undefined;
    
    if (isImageRemoved) {
      // 画像が明示的に削除された場合
      updatedImageUrl = null;
      console.log("📝 画像削除 - nullに設定");
    } else if (newFile) {
      // 新しいファイルがアップロードされる場合
      updatedImageUrl = undefined; // アップロード後に設定される
      console.log("📝 新しい画像のアップロード予定");
    } else {
      // 既存画像を維持する場合
      updatedImageUrl = existingImageUrl;
      console.log("📝 既存画像を維持:", existingImageUrl);
    }

    try {
      // 新しいファイルのアップロード処理
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
        updatedImageUrl = uploadResult.imageUrl;
        console.log("✅ 新しい画像アップロード成功:", updatedImageUrl);
      }

      // JWTトークンをローカルストレージから取得
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error(dict.needLogin);
      }

      // 投稿データの更新
      console.log("📤 サーバーに更新リクエスト送信:", {
        title,
        content,
        imageUrl: updatedImageUrl
      });

      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          content,
          imageUrl: updatedImageUrl
        }),
      });

      console.log("サーバー応答ステータス:", res.status);

      if (res.ok) {
        alert(dict.updateSuccess);
        router.push("/blog");
        router.refresh();
        console.log("✅ 投稿更新完了 - ブログ一覧ページへリダイレクト");
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || dict.updateFail);
      }
    } catch (err: any) {
      console.error("🚨 投稿更新または画像アップロード中にエラーが発生:", err);
      setError(err.message || dict.updateFail);
    } finally {
      setLoading(false); // ロード終了
    }
  };

  // ローディング状態のUI
  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen transition-all duration-300 ${
        theme === 'dark'
          ? 'dark bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
          : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      }`}>
        <div className={`p-8 rounded-2xl shadow-2xl transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-gray-800/60 border border-gray-700/50 text-white'
            : 'bg-white/80 border border-gray-200/50 text-gray-900'
        }`}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg">{dict.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  // エラー状態のUI
  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-screen transition-all duration-300 ${
        theme === 'dark'
          ? 'dark bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
          : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      }`}>
        <div className={`p-8 rounded-2xl shadow-2xl transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-gray-800/60 border border-gray-700/50'
            : 'bg-white/80 border border-gray-200/50'
        }`}>
          <div className="text-center text-red-500">
            <p className="text-lg">{error}</p>
            <button
              onClick={() => router.push("/blog")}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {lang === "ja" ? "ブログに戻る" : "Back to Blog"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    // 最上位のコンテナ - グラデーション背景
    <div className={`min-h-screen transition-all duration-300 ${
      theme === 'dark'
        ? 'dark bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      {/* 言語切り替えとテーマトグルボタンのコンテナ */}
      <div className="absolute top-6 right-6 flex items-center space-x-4">
        {/* 言語選択ボタン */}
        <div className={`inline-flex rounded-xl overflow-hidden shadow-lg ${
          theme === 'dark'
            ? 'bg-gray-800/80 backdrop-blur-sm border border-gray-700/50'
            : 'bg-white/80 backdrop-blur-sm border border-gray-200/50'
        }`}>
          <button
            onClick={() => setLang("en")}
            className={`px-4 py-2 font-medium transition-all duration-200 ${
              lang === "en"
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                : theme === 'dark'
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("ja")}
            className={`px-4 py-2 font-medium transition-all duration-200 ${
              lang === "ja"
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                : theme === 'dark'
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
            }`}
          >
            JP
          </button>
        </div>
        {/* ダークモード切り替えボタンコンポーネント */}
        <ThemeToggleButton />
      </div>

      {/* メインコンテンツコンテナ */}
      <div className="flex items-center justify-center min-h-screen pt-20 pb-8 px-4">
        <div className={`p-8 rounded-2xl shadow-2xl w-full max-w-2xl transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-gray-800/60 border border-gray-700/50'
            : 'bg-white/80 border border-gray-200/50'
        }`}>
          {/* ページタイトル (辞書から取得) */}
          <h1 className={`text-3xl font-bold mb-8 text-center bg-gradient-to-r ${
            theme === 'dark'
              ? 'from-blue-400 to-purple-400'
              : 'from-blue-600 to-purple-600'
          } bg-clip-text text-transparent`}>
            {dict.editPostTitle}
          </h1>

          <form onSubmit={handleUpdate} className="space-y-6">
            {/* タイトル入力フィールド */}
            <div>
              <label htmlFor="title" className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {dict.titlePlaceholder}
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-5 py-3 rounded-xl border transition-all duration-200 ${
                  theme === 'dark'
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
                    : 'bg-white/80 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                } focus:outline-none disabled:opacity-50`}
                placeholder={dict.titlePlaceholder}
                required
                disabled={loading}
              />
            </div>

            {/* 内容入力テキストエリア */}
            <div>
              <label htmlFor="content" className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {dict.contentPlaceholder}
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`w-full px-5 py-3 rounded-xl border transition-all duration-200 h-40 resize-none ${
                  theme === 'dark'
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
                    : 'bg-white/80 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                } focus:outline-none disabled:opacity-50`}
                placeholder={dict.contentPlaceholder}
                required
                disabled={loading}
              />
            </div>

            {/* 画像アップロードフィールド */}
            <div>
              <label htmlFor="image" className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {lang === "ja" ? "画像 (オプション)" : "Image (Optional)"}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                id="image"
                accept="image/*"
                onChange={handleFileChange}
                className={`w-full px-5 py-3 rounded-xl border transition-all duration-200 ${
                  theme === 'dark'
                    ? 'bg-gray-700/50 border-gray-600 text-white file:bg-blue-600 file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4 hover:file:bg-blue-700'
                    : 'bg-white/80 border-gray-300 text-gray-900 file:bg-blue-50 file:text-blue-700 file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4 hover:file:bg-blue-100'
                } focus:outline-none disabled:opacity-50`}
                disabled={loading}
              />
              
              {/* 画像プレビューと制御ボタン */}
              {imagePreview && (
                <div className="mt-4">
                  <p className={`text-sm mb-2 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {lang === "ja" ? "画像プレビュー" : "Image Preview"}:
                  </p>
                  <div className="relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt={lang === "ja" ? "画像プレビュー" : "Image Preview"} 
                      className="max-w-xs h-auto rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-600" 
                    />
                    {/* X削除ボタン */}
                    <button
                      type="button"
                      onClick={handleImageCancel}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-200 shadow-lg"
                      title={lang === "ja" ? "画像削除" : "Remove Image"}
                    >
                      ×
                    </button>
                  </div>
                  
                  {/* 削除された状態で既存画像がある場合の復元ボタン */}
                  {isImageRemoved && existingImageUrl && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={handleRestoreImage}
                        className={`px-4 py-2 text-sm rounded-lg border transition-all duration-200 ${
                          theme === 'dark'
                            ? 'border-blue-400 text-blue-400 hover:bg-blue-400/10'
                            : 'border-blue-500 text-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        {lang === "ja" ? "既存画像を復元" : "Restore Original Image"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 画像が削除された状態で既存画像がある場合の復元オプション */}
              {!imagePreview && existingImageUrl && !newFile && (
                <div className="mt-4 p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <p className={`text-sm mb-3 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {lang === "ja" ? "既存の画像が削除されました。" : "The existing image has been removed."}
                  </p>
                  <button
                    type="button"
                    onClick={handleRestoreImage}
                    className={`px-4 py-2 text-sm rounded-lg border transition-all duration-200 ${
                      theme === 'dark'
                        ? 'border-blue-400 text-blue-400 hover:bg-blue-400/10'
                        : 'border-blue-500 text-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    {lang === "ja" ? "既存画像を復元" : "Restore Original Image"}
                  </button>
                </div>
              )}
            </div>

            {/* エラーメッセージ表示 */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-100 border border-red-200 text-red-700 text-center">
                {error}
              </div>
            )}

            {/* 更新ボタン */}
            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={loading}
            >
              {loading ? (lang === "ja" ? "更新中..." : "Updating...") : dict.updatePost}
            </button>

            {/* キャンセルボタン */}
            <button
              type="button"
              onClick={() => router.push("/blog")}
              className={`w-full px-6 py-3 font-semibold rounded-xl border-2 transition-all duration-200 ${
                theme === 'dark'
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100/50 hover:text-gray-900'
              }`}
            >
              {dict.cancel}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}