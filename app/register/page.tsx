// 📂 app/register/page.tsx
"use client"; // このファイルがクライアントサイドで実行されることを宣言します。

import { useState } from "react";
import { useRouter } from "next/navigation"; // ルーティング管理のためのuseRouterをインポートします。
import { useLang } from "@/components/LanguageProvider"; // LanguageProviderから言語コンテキストフックをインポートします。
import en from "@/locales/en.json"; // 英語の辞書ファイルをインポートします。
import ja from "@/locales/ja.json"; // 日本語の辞書ファイルをインポートします。

import { useTheme } from "@/components/ThemeProvider"; // ★ useTheme フックをインポートします。

/**
 * ユーザー登録ページコンポーネント
 * ユーザーが新しいアカウントを登録するためのフォームを提供します。
 */
export default function RegisterPage() {
  // 名前を管理するstate
  const [name, setName] = useState("");
  // メールアドレスを管理するstate
  const [email, setEmail] = useState("");
  // パスワードを管理するstate
  const [password, setPassword] = useState("");
  // ユーザーへのメッセージ（成功/エラー）とそのタイプを管理するstate
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const router = useRouter(); // Next.jsのルーターフックを初期化します。

  // 言語コンテキストから現在の言語 (lang) と設定関数 (setLang) を取得します。
  const { lang, setLang } = useLang();
  // 現在の言語に基づいて使用する辞書オブジェクトを選択します。
  const dict = lang === "ja" ? ja : en;

  const { theme } = useTheme(); // ★ useTheme フックで現在のテーマ状態を取得します。

  /**
   * ユーザー登録処理を行う非同期ハンドラー関数。
   * フォーム送信時に呼び出されます。
   * @param {React.FormEvent} e - フォームイベントオブジェクト
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); // デフォルトのフォーム送信動作を防止します。
    setMessage(null); // 新しい登録試行時に既存のメッセージをクリアします。

    try {
      // APIエンドポイントにユーザー登録リクエストを送信します。
      const res = await fetch("/api/auth/", {
        method: "POST", // HTTPメソッドはPOST
        headers: { "Content-Type": "application/json" }, // リクエストボディの形式はJSON
        body: JSON.stringify({ type: "register", name, email, password }), // 登録タイプ、名前、メール、パスワードをJSON形式で送信
      });

      // サーバーからの応答をJSON形式で解析します。
      const data = await res.json();

      // レスポンスが成功ステータス (res.ok) の場合
      if (res.ok) {
        // 成功メッセージを表示 (辞書から取得)
        setMessage({ text: dict.registerSuccess, type: "success" });
        // UX向上のため、メッセージ表示後に2秒待ってからログインページへリダイレクトします。
        setTimeout(() => router.push("/"), 2000);
      } else {
        // レスポンスがエラーの場合、サーバーからのエラーメッセージまたはデフォルトの登録失敗メッセージを表示します。
        setMessage({ text: data.error || dict.registerFail, type: "error" });
      }
    } catch (error) {
      // ネットワークエラーなど、リクエスト自体が失敗した場合
      console.error("ユーザー登録中にサーバーエラーが発生しました:", error);
      setMessage({ text: dict.serverError, type: "error" }); // サーバーエラーメッセージを表示します。
    }
  };

  return (
    // ページ全体のコンテナ。中央寄せ、背景色、相対位置指定
    // ★ テーマ状態にD応じて dark クラスを適用し、Tailwind のダークモードユーティリティを有効にします。
    <div className={`flex items-center justify-center min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-gray-100 dark:bg-gray-900 relative`}>
      {/* 言語切り替えボタン - 右上固定 */}
      <div className="absolute top-4 right-4">
        <div className="inline-flex shadow rounded overflow-hidden">
          {/* 英語切り替えボタン */}
          <button
            onClick={() => setLang("en")}
            className={`px-3 py-1 font-medium ${
              lang === "en"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white" // ★ ダークモードクラスを追加
            }`}
          >
            EN
          </button>
          {/* 日本語切り替えボタン */}
          <button
            onClick={() => setLang("ja")}
            className={`px-3 py-1 font-medium ${
              lang === "ja"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white" // ★ ダークモードクラスを追加
            }`}
          >
            JP
          </button>
        </div>
      </div>

      {/* 登録フォームのコンテナ */}
      {/* ★ ダークモードクラスを追加 */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-96">
        {/* 登録フォームのタイトル (辞書から取得) */}
        {/* ★ ダークモードクラスを追加 */}
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white">{dict.registerTitle}</h2>

        {/* メッセージ表示領域 (message stateに基づいて条件的に表示) */}
        {message && (
          <div
            className={`mb-4 px-4 py-3 rounded text-center ${
              message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
            role="alert" // スクリーンリーダーのためのロール
          >
            {message.text} {/* 表示するメッセージテキスト */}
          </div>
        )}

        {/* 登録フォーム */}
        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            {/* 名前入力フィールド (プレースホルダーも辞書から取得) */}
            <input
              type="text"
              placeholder={dict.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              // ★ 入力フィールドにダークモードクラスを追加
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-green-400 focus:border-green-400 transition"
              required // 必須入力
            />
          </div>
          <div>
            {/* メールアドレス入力フィールド (プレースホルダーも辞書から取得) */}
            <input
              type="email"
              placeholder={dict.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // ★ 入力フィールドにダークモードクラスを追加
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-green-400 focus:border-green-400 transition"
              required // 必須入力
            />
          </div>
          <div>
            {/* パスワード入力フィールド (プレースホルダーも辞書から取得) */}
            <input
              type="password"
              placeholder={dict.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              // ★ 入力フィールドにダークモードクラスを追加
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-green-400 focus:border-green-400 transition"
              required // 必須入力
            />
          </div>
          {/* 登録ボタン (テキストも辞書から取得) */}
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg shadow-md transition"
          >
            {dict.registerButton}
          </button>
        </form>
        {/* 既にアカウントがある場合のプロンプトとログインリンク (テキストも辞書から取得) */}
        {/* ★ ダークモードクラスを追加 */}
        <p className="text-center mt-4 text-gray-600 dark:text-gray-300">
          {dict.alreadyAccountPrompt}{" "}
          <a href="/" className="text-blue-500 font-bold hover:underline">
            {dict.loginLink}
          </a>
        </p>
      </div>
    </div>
  );
}