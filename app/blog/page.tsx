// 📂 app/blog/page.tsx
"use client"; // クライアントコンポーネントであることを宣言

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { formatDistanceToNow, format } from "date-fns";
import { ko } from "date-fns/locale"; // 日本語ロケールを考慮してko（韓国語）からja（日本語）로 변경
// Note: formatDistanceToNow, format 함수에서 일본어 로케일을 사용하려면 'ja'를 import해야 합니다.
// import { ja } from "date-fns/locale"; // formatDistanceToNow를 일본어로 사용하려면 주석 해제

import { useLang } from "@/components/LanguageProvider"; // 言語プロバイダーをインポート
import en from "@/locales/en.json"; // 英語ロケールデータ
import ja from "@/locales/ja.json"; // 日本語ロケールデータ

import { useTheme } from "@/components/ThemeProvider"; // テーマプロバイダーからuseThemeフックをインポート
import ThemeToggleButton from "@/components/ThemeToggleButton"; // テーマ切り替えボタンコンポーネントをインポート

// 投稿データのインターフェース定義
interface Post {
  id: number;
  title: string;
  content: string;
  userid: number;
  created_at: string;
  username: string;
  image_url?: string;
}

// デコードされたJWTトークンのインターフェース定義
interface DecodedToken {
  id: number;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

/**
 * ブログページコンポーネント
 * 投稿の表示、検索、ソート、作成、編集、削除機能を提供します。
 * ユーザー認証とダークモード/言語切り替えにも対応します。
 * @returns React.FC
 */
export default function BlogPage() {
  const router = useRouter(); // Next.jsルーターフック
  const [posts, setPosts] = useState<Post[]>([]); // 投稿リストの状態
  const [isLoggedIn, setIsLoggedIn] = useState(false); // ログイン状態
  const [userId, setUserId] = useState<number | null>(null); // ログインユーザーID
  const [userEmail, setUserEmail] = useState<string | null>(null); // ログインユーザーメール
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest"); // 投稿ソート順
  const [search, setSearch] = useState(""); // 検索キーワード
  const [userName, setUserName] = useState<string | null>(null); // ログインユーザー名

  const { lang, setLang } = useLang(); // 言語状態と設定関数を取得
  const dict = lang === "ja" ? ja : en; // 現在の言語に応じた辞書データを設定

  const { theme, toggleTheme } = useTheme(); // 現在のテーマ状態を取得 (light/dark/undefined)

  /**
   * 投稿を非同期でフェッチする関数。
   * @param keyword 検索キーワード (オプション)
   */
  const fetchPosts = useCallback(async (keyword = "") => {
    try {
      const queryParams = new URLSearchParams();
      if (keyword) {
        queryParams.append("search", encodeURIComponent(keyword));
      }
      if (sortOrder) {
        queryParams.append("orderBy", sortOrder);
      }

      const url = `/api/posts?${queryParams.toString()}`;

      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        cache: "no-store", // キャッシュを使用しない
        headers: headers
      });

      // 認証エラー時のハンドリング
      if (res.status === 401 || res.status === 403) {
        console.error("API認証失敗: トークンがないか無効です。");
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        setUserId(null);
        setUserEmail(null);
        setUserName(null);
        router.push("/"); // ログインページへリダイレクト
        return;
      }

      if (!res.ok) throw new Error("サーバー応答失敗");

      const data: Post[] = await res.json();
      setPosts(data);
    } catch (error) {
      console.error("投稿の読み込みに失敗しました:", error);
    }
  }, [sortOrder, router]); // sortOrderとrouterが変更された場合にのみ関数を再作成

  /**
   * コンポーネントマウント時および依存関係の変更時に実行される副作用フック。
   * ユーザー認証状態の確認と投稿のフェッチを行います。
   */
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        // トークンの有効期限チェック
        if (decoded.exp < currentTime) {
          console.warn("トークンが期限切れです。ログアウト処理を実行します。");
          localStorage.removeItem("token");
          setIsLoggedIn(false);
          setUserId(null);
          setUserEmail(null);
          setUserName(null);
          router.push("/");
          return;
        }

        setIsLoggedIn(true);
        setUserId(decoded.id);
        setUserEmail(decoded.email);
        setUserName(decoded.name);
      } catch (err) {
        console.error("トークンのデコードまたは検証エラー:", err);
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        setUserId(null);
        setUserEmail(null);
        setUserName(null);
        router.push("/");
        return;
      }
    } else {
      // トークンがない場合、ログアウト状態に設定し、ルートパスへリダイレクト
      setIsLoggedIn(false);
      setUserId(null);
      setUserEmail(null);
      setUserName(null);
      router.push("/");
      return;
    }

    fetchPosts(search); // 認証後、投稿をフェッチ
  }, [fetchPosts, search, router]); // 依存関係が変更された場合にのみ実行

  /**
   * 投稿を削除するハンドラー関数。
   * @param id 削除する投稿のID
   */
  const handleDeletePost = async (id: number) => {
    if (!confirm(dict.confirmDelete)) return; // 削除確認

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/"); // トークンがない場合、ログインページへリダイレクト
        return;
      }

      const res = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        // 認証エラー時のハンドリング
        if (res.status === 401 || res.status === 403) {
          console.error("削除API認証失敗: トークンがないか無効です。");
          localStorage.removeItem("token");
          router.push("/");
          return;
        }
        const errorData = await res.json();
        throw new Error(errorData.error || dict.deleteFail);
      }

      fetchPosts(search); // 削除成功後、投稿リストを再フェッチ
    } catch (error) {
      console.error("削除に失敗しました:", error); // 削除失敗ログ
    }
  };

  /**
   * ログアウト処理ハンドラー
   */
  const handleLogout = () => {
    localStorage.removeItem("token"); // トークンを削除
    setIsLoggedIn(false);
    setUserId(null);
    setUserEmail(null);
    setUserName(null);
    router.push("/"); // ルートパスへリダイレクト
  };

  /**
   * 作成日時をフォーマットする関数。
   * 24時間以内であれば相対時間、それ以外であれば年月日形式で表示。
   * @param dateString 日付文字列
   * @returns フォーマットされた日付文字列
   */
  const formatCreatedAt = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 1000 * 60 * 60 * 24) {
      // ko (韓国語) 로케일 대신 ja (일본어) 로케일을 사용하려면 'date-fns/locale/ja'를 import해야 합니다.
      return formatDistanceToNow(date, { addSuffix: true, locale: ko }); // 또는 locale: ja
    }

    return format(date, "yyyy.MM.dd");
  };

  return (
    // 最上位のdiv: Flexboxレイアウト、最小の高さ、現在のテーマに応じた背景色とテキスト色を適用
    <div className={`flex min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
      {/* サイドバー: 固定幅、濃い背景、白いテキスト */}
      <aside className="w-48 bg-gray-800 text-white p-4 fixed h-full flex flex-col items-center">
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded w-full text-center"
          >
            {dict.logout}
          </button>
        )}
      </aside>

      {/* メインコンテンツエリア: サイドバーの幅を考慮して左マージンを設定 */}
      <div className="flex-1 ml-48 p-8">
        {/* 言語切り替えボタンとダークモードトグルボタンのコンテナ: 右上絶対位置 */}
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          {/* 言語切り替えボタン群 */}
          <div className="inline-flex shadow rounded overflow-hidden">
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1 font-medium ${
                lang === "en" ? "bg-blue-600 text-white" : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("ja")}
              className={`px-3 py-1 font-medium ${
                lang === "ja" ? "bg-blue-600 text-white" : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white"
              }`}
            >
              JP
            </button>
          </div>

          {/* テーマ切り替えボタン */}
          <ThemeToggleButton />
        </div>

        {/* ページタイトル */}
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-gray-100">
          {dict.title}
        </h2>

        {/* ログインユーザーへの歓迎メッセージ */}
        {isLoggedIn && userName && (
          <p className="text-center text-gray-700 dark:text-gray-300 mb-4">
            {dict.welcome} {userName}さん！
          </p>
        )}

        {/* 新規投稿ボタン */}
        <div className="flex justify-center mb-4">
          <button
            onClick={() => router.push("/blog/new")}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            {dict.create}
          </button>
        </div>

        {/* 検索およびソートUIコンテナ */}
        <div className="flex justify-center mb-4 space-x-2">
          {/* 検索入力欄 */}
          <input
            type="text"
            placeholder={dict.searchPlaceholder}
            // 検索入力欄のスタイル: ダークモードでもテキストが視認できるように設定
            className="w-1/2 px-4 py-2 rounded border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            value={search}
            onChange={(e) => {
              const keyword = e.target.value;
              setSearch(keyword);
            }}
          />
          {/* 検索ボタン */}
          <button
            onClick={() => fetchPosts(search)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            {dict.search}
          </button>

          {/* 検索キーワードがある場合に表示される「すべて表示」ボタン */}
          {search && (
            <button
              onClick={() => {
                setSearch("");
                fetchPosts("");
              }}
              className="bg-gray-300 hover:bg-gray-400 text-black dark:bg-gray-700 dark:text-white px-4 py-2 rounded"
            >
              {dict.showAll}
            </button>
          )}

          {/* ソートボタン群 */}
          <button
            onClick={() => setSortOrder("latest")}
            className={`px-4 py-2 rounded ${
              sortOrder === "latest" ? "bg-blue-600 text-white" : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white"
            }`}
          >
            {dict.latest}
          </button>
          <button
            onClick={() => setSortOrder("oldest")}
            className={`px-4 py-2 rounded ${
              sortOrder === "oldest" ? "bg-blue-600 text-white" : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white"
            }`}
          >
            {dict.oldest}
          </button>
        </div>

        {/* 投稿リスト */}
        <ul className="mt-6 space-y-4">
          {posts.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">{dict.noPosts}</p>
          ) : (
            posts.map((post) => (
              <li key={post.id} className="border border-gray-200 dark:border-gray-700 p-4 rounded shadow flex flex-col md:flex-row items-start md:items-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <div className="flex-grow">
                  {/* 投稿タイトル (クリックで詳細ページへ) */}
                  <h3
                    className="text-xl font-bold mb-2 cursor-pointer hover:text-blue-600 transition-colors duration-200"
                    onClick={() => router.push(`/blog/${post.id}`)}
                  >
                    {post.title}
                  </h3>
                  {/* 投稿内容の最初の行をプレビューとして表示 */}
                  <p className="text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">{post.content.split('\n')[0]}</p>
                  {/* 投稿者と作成日時 */}
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {dict.author}: {post.username} ・ {dict.date}: {formatCreatedAt(post.created_at)}
                  </p>
                </div>

                {/* 画像がある場合に表示 */}
                {post.image_url && (
                  <div className="md:ml-4 flex-shrink-0 mt-4 md:mt-0">
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="w-24 h-24 object-cover rounded-md shadow-sm"
                    />
                  </div>
                )}

                {/* ログインユーザーが自身の投稿の場合に表示される編集・削除ボタン */}
                {userId === post.userid && (
                  <div className="mt-2 flex gap-2 md:ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // 親要素のクリックイベントが発火しないようにする
                        router.push(`/blog/${post.id}/edit`);
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                    >
                      {dict.edit}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // 親要素のクリックイベントが発火しないようにする
                        handleDeletePost(post.id);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                    >
                      {dict.delete}
                    </button>
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}