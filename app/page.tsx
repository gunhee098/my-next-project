// 📂 app/page.tsx (New Login Page at Root)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LanguageProvider"; // 言語プロバイダーをインポート

import { useTheme } from "@/components/ThemeProvider"; // テーマプロバイダーからuseThemeフックをインポート
import ThemeToggleButton from "@/components/ThemeToggleButton"; // テーマ切り替えボタンコンポーネントをインポート

import en from "@/locales/en.json"; // 英語ロケールデータ
import ja from "@/locales/ja.json"; // 日本語ロケールデータ

/**
 * ログインページコンポーネント
 * ユーザーの認証処理と、言語・テーマ切り替え機能を提供します。
 * @returns React.FC
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter(); // Next.jsルーターフック

  const { lang, setLang } = useLang(); // 言語状態と設定関数を取得
  const dict = lang === "ja" ? ja : en; // 現在の言語に応じた辞書データを設定

  const { theme } = useTheme(); // 現在のテーマ状態を取得 (light/dark/undefined)

  /**
   * ログイン処理ハンドラー
   * @param e フォームイベントオブジェクト
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // デフォルトのフォーム送信動作を防止

    try {
      const res = await fetch("/api/auth/", { // 💡 /api/auth/ でログインAPIを呼び出す
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "login", email, password }),
        credentials: "include", // クッキーなどの認証情報をリクエストに含める
      });

      const data = await res.json(); // サーバーからのJSONレスポンスを解析

      if (res.ok) {
        localStorage.setItem("token", data.token); // 認証トークンをローカルストレージに保存
        router.push("/blog"); // ログイン成功後、ブログページへリダイレクト
      } else {
        alert(data.error || dict.loginFail); // ログイン失敗メッセージを表示
      }
    } catch (error) {
      console.error("ログイン中にエラーが発生しました:", error); // エラーログを追加
      alert(dict.serverError); // サーバーエラーメッセージを表示
    }
  };

  return (
    // 最上位のコンテナ。テーマ状態に応じて`dark`クラスを適用し、Tailwindのダークモードユーティリティを有効にする
    <div className={`flex items-center justify-center min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-gray-100 dark:bg-gray-900 relative`}>
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        {/* 言語切り替えボタン */}
        <div className="inline-flex shadow rounded overflow-hidden">
          <button
            onClick={() => setLang("en")}
            className={`px-3 py-1 font-medium ${
              lang === "en"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("ja")}
            className={`px-3 py-1 font-medium ${
              lang === "ja"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white"
            }`}
          >
            JP
          </button>
        </div>
        {/* ダークモード切り替えボタンコンポーネント */}
        <ThemeToggleButton />
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-96">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white">
          {dict.loginTitle}
        </h2>
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <input
              type="email"
              placeholder={dict.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // 入力フィールドのスタイル: ダークモードでもテキストが視認できるように設定
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-green-400 focus:border-green-400 transition"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder={dict.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              // 入力フィールドのスタイル: ダークモードでもテキストが視認できるように設定
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-green-400 focus:border-green-400 transition"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg shadow-md transition"
          >
            {dict.loginButton}
          </button>
        </form>
        <p className="text-center mt-4 text-gray-600 dark:text-gray-300">
          {dict.noAccountPrompt}{" "}
          <a
            href="/register" // 💡 修正: /auth/register から /register へパス変更
            className="text-blue-500 font-bold hover:underline"
          >
            {dict.registerLink}
          </a>
        </p>
      </div>
    </div>
  );
}