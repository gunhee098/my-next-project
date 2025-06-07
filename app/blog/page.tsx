"use client"; // このファイルがクライアントサイドで実行されることを宣言

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // ルーティング管理のためのuseRouterをインポート
import { jwtDecode } from "jwt-decode"; // JWTトークンをデコードするためのライブラリ
import { formatDistanceToNow, format } from "date-fns"; // 日付の相対時間表示とフォーマットのための関数
import { ja } from "date-fns/locale"; // 日本語ロケールをインポート
import { useLang } from "@/components/LanguageProvider"; // 言語コンテキストフックをインポート (エイリアスパスを使用)
import en from "../locales/en.json"; // 英語の辞書ファイルをインポート
import jaDict from "../locales/ja.json"; // 日本語の辞書ファイルをインポート (競合を避けるためjaDictとリネーム)

// 投稿データのインターフェース定義
interface Post {
  id: number; // 投稿ID
  title: string; // タイトル
  content: string; // 内容
  userid: number; // 投稿ユーザーID
  created_at: string; // 作成日時
  username: string; // 投稿ユーザー名
}

// デコードされたJWTトークンのペイロードインターフェース定義
interface DecodedToken {
  id: number; // ユーザーID
  email: string; // ユーザーメールアドレス
  name: string; // ユーザー名
  iat: number; // 発行時間
  exp: number; // 有効期限
}

// ブログページコンポーネント
// ブログ投稿の一覧を表示し、ユーザー認証、検索、ソート、投稿管理機能を提供します。
export default function BlogPage() {
  const router = useRouter(); // Next.jsのルーターフックを初期化

  // 投稿データを管理するstate
  const [posts, setPosts] = useState<Post[]>([]);
  // ログイン状態を管理するstate
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // ログインユーザーのIDを管理するstate
  const [userId, setUserId] = useState<number | null>(null);
  // ログインユーザーのメールアドレスを管理するstate
  const [userEmail, setUserEmail] = useState<string | null>(null);
  // 投稿のソート順序を管理するstate（最新順または古い順）
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  // 検索キーワードを管理するstate
  const [search, setSearch] = useState("");
  // ログインユーザーの名前を管理するstate
  const [userName, setUserName] = useState<string | null>(null);

  // 言語コンテキストから現在の言語と設定関数を取得
  const { lang, setLang } = useLang();
  // 現在の言語に基づいて使用する辞書ファイルを決定
  const dict = lang === "ja" ? jaDict : en;

  // コンポーネントのマウント時および依存配列が変更された時に実行されるエフェクトフック
  useEffect(() => {
    // ローカルストレージからトークンを取得
    const token = localStorage.getItem("token");
    if (token) {
      try {
        // トークンをデコードし、ユーザー情報をstateに保存
        const decoded: DecodedToken = jwtDecode(token);
        setIsLoggedIn(true);
        setUserId(decoded.id);
        setUserEmail(decoded.email);
        setUserName(decoded.name);
      } catch (err) {
        // トークンデコードエラーが発生した場合
        console.error("トークンデコードエラー:", err);
      }
    }

    // 投稿データを取得
    fetchPosts();
  }, []); // 空の依存配列により、コンポーネントがマウントされた時のみ実行

  // 投稿データをAPIから取得する非同期関数
  // @param keyword - 検索キーワード (オプション)
  const fetchPosts = async (keyword = "") => {
    try {
      // 検索キーワードがある場合はクエリパラメータを追加したURLを生成
      const url = keyword
        ? `/api/posts?search=${encodeURIComponent(keyword)}`
        : `/api/posts`;

      // APIから投稿データをフェッチ (キャッシュ無効化)
      const res = await fetch(url, { cache: "no-store" });
      // レスポンスが正常でない場合、エラーをスロー
      if (!res.ok) throw new Error("サーバー応答に失敗しました");

      // レスポンスデータをJSON形式で解析し、stateに設定
      const data: Post[] = await res.json();
      setPosts(data);
    } catch (error) {
      console.error("投稿の読み込みに失敗しました:", error);
    }
  };

  // 投稿を削除するハンドラー関数
  // @param id - 削除する投稿のID
  const handleDeletePost = async (id: number) => {
    // 削除確認ダイアログを表示。ユーザーがキャンセルした場合は処理を中断
    if (!confirm(dict.confirmDelete)) return;

    try {
      // ローカルストレージからトークンを取得
      const token = localStorage.getItem("token");
      // トークンが存在しない場合、エラーをスロー
      if (!token) throw new Error(dict.needLogin);

      // 投稿削除APIにDELETEリクエストを送信
      const res = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`, // 認証ヘッダーにトークンを含める
        },
      });

      // レスポンスが正常でない場合、エラーハンドリング
      if (!res.ok) {
        const errorData = await res.json();
        // サーバーからのエラーメッセージ、またはデフォルトの削除失敗メッセージを使用
        throw new Error(errorData.error || dict.deleteFail);
      }

      // 削除成功後、現在の検索キーワードで投稿データを再取得し、リストを更新
      fetchPosts(search);
    } catch (error) {
      console.error("削除に失敗しました:", error);
    }
  };

  // ログアウト処理を行うハンドラー関数
  const handleLogout = () => {
    localStorage.removeItem("token"); // ローカルストレージからトークンを削除
    setIsLoggedIn(false); // ログイン状態を非ログインに設定
    setUserId(null); // ユーザーIDをクリア
    setUserEmail(null); // ユーザーメールアドレスをクリア
    router.push("/"); // ルートパス（ログインページ）へリダイレクト
  };

  // 投稿作成日時をフォーマットする関数
  // 24時間以内であれば相対時間表示、それ以外は特定の日付フォーマットで表示
  // @param dateString - 投稿作成日時を表す文字列
  // @returns フォーマットされた日付文字列
  const formatCreatedAt = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // 24時間以内であれば相対時間表示 (例: "5分前", "昨日")
    if (diff < 1000 * 60 * 60 * 24) {
      // localeを日本語に変更
      return formatDistanceToNow(date, { addSuffix: true, locale: ja });
    }

    // 24時間以上前であれば "YYYY.MM.DD" 形式で表示
    return format(date, "yyyy.MM.dd");
  };

  // 投稿をソートするロジック
  // 現在のsortOrderに基づいて投稿リストをソートします。
  const sortedPosts = [...(posts || [])].sort((a, b) =>
    sortOrder === "latest"
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // 最新順 (新しいものが先)
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime() // 古い順 (古いものが先)
  );

  return (
    <div className="flex min-h-screen">
      {/* サイドバー */}
      <aside className="w-48 bg-gray-800 text-white p-4 fixed h-full flex flex-col items-center">
        {/* ログイン中の場合にのみログアウトボタンを表示 */}
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded w-full text-center"
          >
            {dict.logout} {/* ログアウトボタンのテキスト */}
          </button>
        )}
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 ml-48 p-8 relative">
        {/* 言語切り替えボタン - 右上固定 */}
        <div className="absolute top-8 right-8">
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

        {/* ページタイトル */}
        <h2 className="text-2xl font-bold text-center mb-6">{dict.title}</h2>

        {/* ログイン状態表示 */}
        {isLoggedIn && userName && (
          <p className="text-center text-gray-700 mb-4">
            {dict.welcome} {userName}さん！
          </p>
        )}

        {/* 新規投稿作成ボタン */}
        <div className="flex justify-center mb-4">
          <button
            onClick={() => router.push("/blog/new")}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            {dict.create} {/* 新規投稿ボタンのテキスト */}
          </button>
        </div>

        {/* 検索バーと関連ボタン */}
        <div className="flex justify-center mb-4">
          <input
            type="text"
            placeholder={dict.searchPlaceholder} // 検索プレースホルダーテキスト
            className="border rounded px-4 py-2 w-1/2"
            value={search}
            onChange={(e) => {
              const keyword = e.target.value;
              setSearch(keyword);
              // 検索キーワードが空になったら全投稿を再フェッチ
              if (keyword === "") fetchPosts("");
            }}
          />
          {/* 検索ボタン */}
          <button
            onClick={() => fetchPosts(search)}
            className="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            {dict.search} {/* 検索ボタンのテキスト */}
          </button>
          {/* 検索キーワードがある場合にのみ「すべて表示」ボタンを表示 */}
          {search && (
            <button
              onClick={() => {
                setSearch(""); // 検索キーワードをクリア
                fetchPosts(""); // 全投稿を再フェッチ
              }}
              className="ml-2 bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
            >
              {dict.showAll} {/* すべて表示ボタンのテキスト */}
            </button>
          )}
        </div>

        {/* ソートボタン */}
        <div className="flex justify-center gap-4 mb-4">
          {/* 最新順ソートボタン */}
          <button
            onClick={() => setSortOrder("latest")}
            className={`px-4 py-2 rounded ${
              sortOrder === "latest" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {dict.latest} {/* 最新ボタンのテキスト */}
          </button>
          {/* 古い順ソートボタン */}
          <button
            onClick={() => setSortOrder("oldest")}
            className={`px-4 py-2 rounded ${
              sortOrder === "oldest" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {dict.oldest} {/* 古い順ボタンのテキスト */}
          </button>
        </div>

        {/* 投稿リスト */}
        <ul className="mt-6 space-y-4">
          {sortedPosts.map((post) => (
            <li key={post.id} className="border p-4 rounded shadow">
              <h3 className="text-xl font-bold">{post.title}</h3>
              <p className="text-gray-600 mb-2">{post.content}</p>
              <p className="text-sm text-gray-500">
                {dict.author}: {post.username} ・ {dict.date}: {formatCreatedAt(post.created_at)}
              </p>

              {/* 投稿者がログインユーザーと一致する場合のみ編集・削除ボタンを表示 */}
              {userId === post.userid && (
                <div className="mt-2 flex gap-2">
                  {/* 編集ボタン */}
                  <button
                    onClick={() => router.push(`/blog/${post.id}/edit`)}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                  >
                    {dict.edit} {/* 編集ボタンのテキスト */}
                  </button>
                  {/* 削除ボタン */}
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                  >
                    {dict.delete} {/* 削除ボタンのテキスト */}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}