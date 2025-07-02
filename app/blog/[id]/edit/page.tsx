// 📂 app/blog/[id]/edit/page.tsx
"use client"; // このファイルがクライアントサイドで実行されることを宣言します。

// [モジュールインポート]
import { useEffect, useState } from "react"; // React のライフサイクルと状態管理フック
import { useParams, useRouter } from "next/navigation"; // Next.js のルーティング管理のためのフックをインポート
import { useLang } from "@/components/LanguageProvider"; // LanguageProvider から言語コンテキストフックをインポート
import { useTheme } from "@/components/ThemeProvider"; // ✅ ThemeProvider からテーマコンテキストフックをインポート
import en from "@/locales/en.json"; // 英語の辞書ファイルをインポート
import ja from "@/locales/ja.json"; // 日本語の辞書ファイルをインポート

/**
 * @component EditPost
 * @description 投稿編集ページコンポーネント。
 * URLパラメータから特定の投稿IDを取得し、その投稿の詳細データを取得して編集フォームを提供します。
 * 画像の更新機能、多言語対応、テーマ切り替えに対応しています。
 */
export default function EditPost() {
  const router = useRouter(); // Next.js ルーターフックを初期化し、ナビゲーションを管理
  const params = useParams(); // URL パラメータから動的ルーティングのパラメータを取得
  const postId = params.id as string; // 投稿IDを文字列として抽出（例: /blog/abcdef/edit の 'abcdef'）

  // [状態管理]
  // 編集フォームのタイトルと内容を管理するステート
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  // 既存の画像URLを管理するステート (データベースから取得した値)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  // 新しく選択されたファイルオブジェクトと、画像プレビュー用のデータURLを管理するステート
  const [newFile, setNewFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null); // 新しいファイルのプレビュー、または既存の画像の表示用

  // ローディング状態とエラー状態
  const [loading, setLoading] = useState(true); // コンポーネント初期ロード時は true
  const [error, setError] = useState<string | null>(null); // エラーメッセージがあれば格納

  // [コンテキストフック]
  const { lang } = useLang(); // 言語コンテキストから現在の言語を取得
  const dict = lang === "ja" ? ja : en; // 現在の言語に基づいて適切な辞書をロード

  const { theme } = useTheme(); // テーマコンテキストから現在のテーマを取得

  /**
   * @effect 投稿データ取得
   * コンポーネントがマウントされた時、または `postId` が変更された時に投稿データを非同期で取得します。
   */
  useEffect(() => {
    const fetchPost = async () => {
      console.log("🔄 編集する投稿データを読み込み中...");
      try {
        // API から指定されたIDの投稿データを取得するためのリクエスト
        const res = await fetch(`/api/posts/${postId}`);
        if (!res.ok) {
          console.error(`⚠ 投稿取得失敗: ステータス ${res.status}`);
          // サーバーからのエラーレスポンスがあればそれを表示
          const errorData = await res.json();
          throw new Error(errorData.error || dict.fetchPostFail);
        }
        const data = await res.json(); // 応答データをJSONとしてパースし、投稿データとして取得
        
        // 取得した投稿データをステートに設定
        setTitle(data.title);
        setContent(data.content);
        
        // 既存の画像URLがあればステートにセットし、画像プレビューの初期値とする
        if (data.imageUrl) {
          setExistingImageUrl(data.imageUrl);
          setImagePreview(data.imageUrl); // 既存の画像を初期プレビューとして表示
        }
        console.log("✅ 投稿の読み込みが完了しました:", data);
      } catch (err: any) {
        console.error("投稿の読み込み中にエラーが発生しました:", err);
        setError(err.message || dict.fetchPostFail);
        router.replace("/blog"); // エラー発生時はブログ一覧ページへリダイレクト
      } finally {
        setLoading(false); // ロード終了
      }
    };

    // postId が有効な場合にのみ投稿データ取得関数を呼び出す
    if (postId) {
      fetchPost();
    }
  }, [postId, router, dict]); // `postId`, `router`, `dict` が変更された場合にエフェクトを再実行

  /**
   * @function handleFileChange
   * @description 新しい画像ファイルが選択された時のハンドラー。
   * 選択されたファイルをステートに保存し、新しい画像のプレビューURLを生成します。
   * @param {React.ChangeEvent<HTMLInputElement>} e - ファイル入力イベントオブジェクト
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setNewFile(selectedFile); // 新しいファイルをステートに保存

      // 新しい画像のプレビューを生成するためのFileReader
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string); // 読み込み完了後、プレビューURLをセット
      };
      reader.readAsDataURL(selectedFile); // ファイルをData URLとして読み込む
    } else {
      // ファイル選択がキャンセルされた場合、新しいファイルをクリアし、
      // 既存の画像URLがあればそれをプレビューに戻す
      setNewFile(null);
      setImagePreview(existingImageUrl);
    }
  };

  /**
   * @function handleUpdate
   * @description 投稿更新処理のハンドラー。
   * フォーム送信時に呼び出され、新しい画像ファイルのアップロード（もしあれば）と
   * 投稿データの更新を非同期で行います。
   * @param {React.FormEvent} e - フォーム送信イベントオブジェクト
   */
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); // デフォルトのフォーム送信動作（ページリロード）を防止
    console.log(`🔧 投稿更新リクエスト開始 (投稿ID: ${postId})`);

    setLoading(true); // 更新処理開始時にローディング状態を設定
    setError(null); // 前回のエラーメッセージをリセット

    // 更新後の画像URLを初期化。新しいファイルがなければ既存のURLを保持。
    let updatedImageUrl: string | undefined = existingImageUrl || undefined;

    try {
      // [画像アップロード処理]
      // 新しいファイルが選択されていれば、/api/upload エンドポイントにアップロード
      if (newFile) {
        console.log("新しい画像をCloudinaryにアップロード中...");
        const formData = new FormData();
        formData.append("file", newFile); // フォームデータにファイルを追加

        const uploadRes = await fetch("/api/upload", {
          method: "POST", // HTTPメソッドはPOST
          body: formData, // FormData を直接ボディとして送信
        });

        if (!uploadRes.ok) {
          // アップロード失敗時のエラーハンドリング
          const errorData = await uploadRes.json();
          throw new Error(errorData.error || "画像のアップロードに失敗しました。");
        }

        const uploadResult = await uploadRes.json();
        updatedImageUrl = uploadResult.imageUrl; // Cloudinary から返された新しい画像URLを取得
        console.log("✅ 新しい画像アップロード成功:", updatedImageUrl);
      }

      // [JWTトークン取得]
      const token = localStorage.getItem("token"); // ローカルストレージからJWTトークンを取得
      if (!token) {
        throw new Error(dict.needLogin); // トークンがない場合は認証エラー
      }

      // [投稿データ更新処理]
      // APIエンドポイントにPUTリクエストを送信して投稿を更新
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT", // HTTPメソッドはPUT (更新操作)
        headers: {
          "Content-Type": "application/json", // リクエストボディの形式はJSON
          "Authorization": `Bearer ${token}` // JWTトークンをAuthorizationヘッダーに含める（認証用）
        },
        body: JSON.stringify({ // 更新するタイトル、内容、画像URLをJSON形式で送信
          title,
          content,
          imageUrl: updatedImageUrl // アップロードされた新しい画像URL、または既存のURL
        }),
      });

      console.log("サーバー応答ステータス:", res.status); // サーバーからの応答ステータスをログ出力

      if (res.ok) {
        alert(dict.updateSuccess); // 更新成功メッセージをユーザーに表示
        // ✅ [修正] ここでリダイレクト先を決定します。
        // router.push(`/blog/${postId}`); // 現在: 投稿詳細ページへリダイレクト
        router.push("/blog"); // 💡 変更: すべての投稿一覧ページへリダイレクト
        console.log("ブログ一覧ページへリダイレクトします。");
      } else {
        // サーバーからのエラー応答をJSONとしてパースし、エラーメッセージを抽出
        const errorData = await res.json();
        throw new Error(errorData.error || dict.updateFail);
      }
    } catch (err: any) {
      console.error("🚨 投稿更新または画像アップロード中にエラーが発生しました:", err);
      setError(err.message || dict.updateFail); // エラーメッセージをステートに設定
    } finally {
      setLoading(false); // 処理終了時にローディング状態を解除
    }
  };

  // [UIレンダリング]
  // ローディング状態の表示
  // 💡 変更: テーマに応じたスタイルを適用
  if (loading) {
    return (
      <div className={`text-center py-8 ${theme === 'dark' ? 'dark:bg-gray-800 dark:text-gray-100' : 'bg-white text-gray-900'}`}>
        {dict.loading}
      </div>
    );
  }

  // エラー発生時の表示
  // 💡 変更: テーマに応じたスタイルを適用
  if (error) {
    return (
      <div className={`text-red-500 text-center py-8 ${theme === 'dark' ? 'dark:bg-gray-800' : 'bg-white'}`}>
        {error}
      </div>
    );
  }

  return (
    // ページ全体のコンテナ。背景色とテキスト色をテーマに基づいて設定。
    <div className={`max-w-2xl mx-auto p-4 relative ${theme === 'dark' ? 'dark:bg-gray-800 dark:text-gray-100' : 'bg-white text-gray-900'}`}>
      <h1 className="text-2xl font-bold mb-4 text-center">{dict.editPostTitle}</h1> {/* 辞書からタイトル取得 */}

      <form onSubmit={handleUpdate} className="mt-4 space-y-4">
        {/* タイトル入力フィールド */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {dict.titlePlaceholder}
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            // 💡 変更: テーマに応じたスタイル適用
            className="w-full border p-2 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
            placeholder={dict.titlePlaceholder}
            required
            disabled={loading}
          />
        </div>

        {/* 内容入力フィールド */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {dict.contentPlaceholder}
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            // 💡 変更: テーマに応じたスタイル適用
            className="w-full border p-2 rounded-md shadow-sm h-40 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
            placeholder={dict.contentPlaceholder}
            required
            disabled={loading}
          ></textarea>
        </div>

        {/* 画像アップロードフィールドとプレビュー */}
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
          {/* 💡 変更: 既存の画像URLがある場合の表示にもダークモードスタイル適用 */}
          {!newFile && existingImageUrl && ( // 新しいファイルが選択されていない場合のみ表示
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  現在の画像: <a href={existingImageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline dark:text-blue-400">表示</a>
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
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? "更新中..." : dict.updatePost}
        </button>
      </form>
    </div>
  );
}