// 📂 app/page.tsx (New Login Page at Root)
"use client"; // このファイルがクライアントコンポーネントであることを宣言します。

import { useState } from "react";
import { useRouter } from "next/navigation"; // Next.jsルーターフックをインポートします。
import { useLang } from "@/components/LanguageProvider"; // 言語プロバイダーをインポートします。

import { useTheme } from "@/components/ThemeProvider"; // テーマプロバイダーからuseThemeフックをインポートします。
import ThemeToggleButton from "@/components/ThemeToggleButton"; // テーマ切り替えボタンコンポーネントをインポートします。

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
  const router = useRouter(); // Next.jsルーターフックを初期化します。

  const { lang, setLang } = useLang(); // 言語状態と設定関数を取得します。
  const dict = lang === "ja" ? ja : en; // 現在の言語に応じた辞書データを設定します。

  const { theme } = useTheme(); // 現在のテーマ状態を取得します (light/dark/undefined)。

  /**
   * ログイン処理ハンドラー
   * @param e フォームイベントオブジェクト
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // デフォルトのフォーム送信動作を防止します。

    try {
      const res = await fetch("/api/auth/", { // 💡 /api/auth/ でログインAPIを呼び出す
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "login", email, password }),
        credentials: "include", // クッキーなどの認証情報をリクエストに含めます。
      });

      const data = await res.json(); // サーバーからのJSONレスポンスを解析します。

      if (res.ok) {
        sessionStorage.setItem("token", data.token); // 認証トークンをローカルストレージに保存します。
        router.push("/blog"); // ログイン成功後、ブログページへリダイレクトします。
      } else {
        alert(data.error || dict.loginFail); // ログイン失敗メッセージを表示します。
      }
    } catch (error) {
      console.error("ログイン中にエラーが発生しました:", error); // エラーログを追加します。
      alert(dict.serverError); // サーバーエラーメッセージを表示します。
    }
  };

  return (
    // 最上位のコンテナ。テーマ状態に応じて背景グラデーションとテキスト色を調整
    <div className={`flex items-center justify-center min-h-screen transition-all duration-300 ${
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

      {/* ログインフォームカード */}
      <div className={`p-8 rounded-2xl shadow-2xl w-full max-w-md transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-gray-800/60 border border-gray-700/50'
          : 'bg-white/80 border border-gray-200/50'
      }`}>
        <h2 className={`text-3xl font-bold mb-8 text-center bg-gradient-to-r ${
          theme === 'dark'
            ? 'from-blue-400 to-purple-400'
            : 'from-blue-600 to-purple-600'
        } bg-clip-text text-transparent`}>
          {dict.loginTitle}
        </h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input
              type="email"
              placeholder={dict.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-5 py-3 rounded-xl border transition-all duration-200 ${
                theme === 'dark'
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
                  : 'bg-white/80 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              } focus:outline-none`}
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder={dict.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-5 py-3 rounded-xl border transition-all duration-200 ${
                theme === 'dark'
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
                  : 'bg-white/80 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              } focus:outline-none`}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {dict.loginButton}
          </button>
        </form>
        <p className={`text-center mt-6 text-sm ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {dict.noAccountPrompt}{" "}
          <a
            href="/register" // 💡 修正: /auth/register から /register へパス変更
            className={`font-bold hover:underline ${
              theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
            }`}
          >
            {dict.registerLink}
          </a>
        </p>
      </div>
    </div>
  );
}