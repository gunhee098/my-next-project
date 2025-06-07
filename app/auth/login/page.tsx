"use client"; // このファイルがクライアントサイドで実行されることを宣言

import { useState } from "react";
import { useRouter } from "next/navigation"; // ルーティング管理のためのuseRouterをインポート
import { useLang } from "@/components/LanguageProvider"; // LanguageProviderから言語コンテキストフックをインポート (エイリアスパス使用)
import en from "@/locales/en.json"; // 英語の辞書ファイルをインポート (エイリアスパス使用)
import ja from "@/locales/ja.json"; // 日本語の辞書ファイルをインポート (エイリアスパス使用)

// ログインページコンポーネント
// ユーザーがログインするためのフォームを提供します。
// コンポーネント名をHomeからLoginPageに変更し、より明確にしました。
export default function LoginPage() {
  // メールアドレスを管理するstate
  const [email, setEmail] = useState("");
  // パスワードを管理するstate
  const [password, setPassword] = useState("");
  const router = useRouter(); // Next.jsのルーターフックを初期化

  // 言語コンテキストから現在の言語 (lang) と設定関数 (setLang) を取得
  const { lang, setLang } = useLang();
  // 現在の言語に基づいて使用する辞書オブジェクトを選択
  const dict = lang === "ja" ? ja : en;

  // ログイン処理を行う非同期ハンドラー関数
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // デフォルトのフォーム送信動作を防止

    try {
      // APIエンドポイントにログインリクエストを送信
      const res = await fetch("/api/auth/", {
        method: "POST", // HTTPメソッドはPOST
        headers: { "Content-Type": "application/json" }, // リクエストボディの形式はJSON
        body: JSON.stringify({ type: "login", email, password }), // ログインタイプ、メール、パスワードをJSON形式で送信
        credentials: "include", // クッキーや認証ヘッダーをリクエストに含める設定
      });

      // サーバーからの応答をJSON形式で解析
      const data = await res.json();

      // レスポンスが成功ステータス (res.ok) の場合
      if (res.ok) {
        localStorage.setItem("token", data.token); // 受け取ったトークンをローカルストレージに保存
        router.push("/blog"); // ログイン成功後、ブログページへリダイレクト
      } else {
        // レスポンスがエラーの場合、サーバーからのエラーメッセージまたはデフォルトのログイン失敗メッセージを表示
        alert(data.error || dict.loginFail);
      }
    } catch (error) {
      // ネットワークエラーなど、リクエスト自体が失敗した場合
      alert(dict.serverError);
    }
  };

  return (
    // ページ全体のコンテナ。中央寄せ、背景色、相対位置指定
    <div className="flex items-center justify-center min-h-screen bg-gray-100 relative">
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

      {/* ログインフォームのコンテナ */}
      <div className="bg-white p-8 rounded-xl shadow-lg w-96">
        {/* ログインフォームのタイトル (辞書から取得) */}
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">{dict.loginTitle}</h2>
        {/* ログインフォーム */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            {/* メールアドレス入力フィールド (プレースホルダーも辞書から取得) */}
            <input
              type="email"
              placeholder={dict.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 transition"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 transition"
              required // 必須入力
            />
          </div>
          {/* ログインボタン (テキストも辞書から取得) */}
          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg shadow-md transition"
          >
            {dict.loginButton}
          </button>
        </form>
        {/* アカウントがない場合のプロンプトと登録リンク (テキストも辞書から取得) */}
        <p className="text-center mt-4 text-gray-600">
          {dict.noAccountPrompt}{" "}
          <a href="/auth/register" className="text-blue-500 font-bold hover:underline">
            {dict.registerLink}
          </a>
        </p>
      </div>
    </div>
  );
}