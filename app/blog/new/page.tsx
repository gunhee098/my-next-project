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

  // 言語コンテキストから現在の言語 (lang) と設定関数 (setLang) を取得
  const { lang, setLang } = useLang();
  // 現在の言語に基づいて使用する辞書オブジェクトを選択
  const dict = lang === "ja" ? ja : en;

  // 投稿作成処理を行う非同期ハンドラー関数
  const handleCreatePost = async () => {
    try {
      // ローカルストレージから認証トークンを取得
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
        body: JSON.stringify({ title, content }), // タイトルと内容をJSON形式で送信
      });

      // レスポンスが正常でない場合
      if (!res.ok) {
        const errorData = await res.json();
        // サーバーからのエラーメッセージ、またはデフォルトの投稿失敗メッセージを使用
        throw new Error(errorData.error || dict.postFail);
      }

      // 投稿成功後、フォームフィールドをクリア
      setTitle("");
      setContent("");
      // 投稿一覧ページへリダイレクト
      router.push("/blog");
    } catch (error) {
      // エラー発生時の処理 (多言語対応メッセージを使用し、エラー詳細もコンソールに出力)
      console.error(dict.postFail, error);
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

      {/* タイトル入力フィールド (プレースホルダーも辞書から取得) */}
      <input
        type="text"
        placeholder={dict.titlePlaceholder}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border p-2 w-full"
      />
      {/* 内容入力テキストエリア (プレースホルダーも辞書から取得) */}
      <textarea
        placeholder={dict.contentPlaceholder}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="border p-2 w-full mt-2 h-40" // 高さ指定
      />
      {/* 投稿作成ボタン (テキストも辞書から取得) */}
      <button
        onClick={handleCreatePost}
        className="bg-blue-500 text-white px-4 py-2 mt-2 rounded hover:bg-blue-600"
      >
        {dict.createPost}
      </button>
    </div>
  );
}