// 📂 app/blog/page.tsx
"use client"; // このファイルがクライアントコンポーネントであることを宣言

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { formatDistanceToNow, format } from "date-fns";
import { ko } from "date-fns/locale"; // 現在韓国語ロケール(ko)を使用。

// Note: formatDistanceToNow, format関数で日本語ロケールを使用する場合、
// 'date-fns/locale/ja'をインポートし、`locale: ja`を適用してください。
// import { ja } from "date-fns/locale"; // 日本語ロケールを使用する場合はこの行のコメントを解除

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
  likes_count: number; // いいね数を表すフィールド
}

// デコードされたJWTトークンのインターフェース定義
interface DecodedToken {
  id: number; // ユーザーID
  email: string;
  name: string;
  iat: number; // トークン発行時間
  exp: number; // トークン有効期限
}

/**
 * ブログページコンポーネント
 * 投稿の表示、検索、ソート、作成、編集、削除機能を提供します。
 * ユーザー認証、ダークモード/言語切り替えにも対応します。
 * @returns React.FC
 */
export default function BlogPage() {
  const router = useRouter(); // Next.jsルーターフックを初期化
  const [posts, setPosts] = useState<Post[]>([]); // 投稿リストの状態管理
  const [isLoggedIn, setIsLoggedIn] = useState(false); // ログイン状態の管理
  const [userId, setUserId] = useState<number | null>(null); // ログインユーザーIDの管理
  const [userEmail, setUserEmail] = useState<string | null>(null); // ログインユーザーメールの管理
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest"); // 投稿ソート順の管理
  const [search, setSearch] = useState(""); // 検索キーワードの管理
  const [userName, setUserName] = useState<string | null>(null); // ログインユーザー名の管理

  const { lang, setLang } = useLang(); // 言語プロバイダーから言語状態と設定関数を取得
  const dict = lang === "ja" ? ja : en; // 現在の言語に応じた辞書データを設定

  const { theme, toggleTheme } = useTheme(); // テーマプロバイダーから現在のテーマ状態を取得

  /**
   * 投稿を非同期でフェッチする関数。
   * @param keyword 検索キーワード (オプション)。デフォルトは空文字列。
   */
  const fetchPosts = useCallback(async (keyword = "") => {
    try {
      const queryParams = new URLSearchParams();
      // 検索キーワードがあればURLに追加
      if (keyword) {
        queryParams.append("search", encodeURIComponent(keyword));
      }
      // ソート順があればURLに追加
      if (sortOrder) {
        queryParams.append("orderBy", sortOrder);
      }

      const url = `/api/posts?${queryParams.toString()}`; // APIリクエストURLを構築

      const token = localStorage.getItem("token"); // ローカルストレージからJWTトークンを取得
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`; // Authorizationヘッダーにトークンを設定
      }

      const res = await fetch(url, {
        cache: "no-store", // キャッシュを使用しない設定
        headers: headers // リクエストヘッダーを設定
      });

      // 認証エラーまたは権限エラーの場合のハンドリング
      if (res.status === 401 || res.status === 403) {
        console.error("API認証失敗: トークンがないか無効です。");
        localStorage.removeItem("token"); // 無効なトークンを削除
        setIsLoggedIn(false);
        setUserId(null);
        setUserEmail(null);
        setUserName(null);
        router.push("/"); // ログインページへリダイレクト
        return;
      }

      // サーバー応答が正常でない場合
      if (!res.ok) throw new Error("サーバーからの応答が不正です。");

      const data: Post[] = await res.json(); // 応答をJSONとしてパース
      setPosts(data); // 投稿リストを更新
    } catch (error) {
      console.error("投稿の読み込みに失敗しました:", error);
    }
  }, [sortOrder, router]); // sortOrderとrouterが変更された場合にのみ関数を再生成

  /**
   * コンポーネントマウント時および依存関係の変更時に実行される副作用フック。
   * ユーザー認証状態の確認と初期投稿のフェッチを行います。
   */
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token); // トークンをデコード
        const currentTime = Date.now() / 1000; // 現在時刻を秒単位で取得

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

        // ログイン状態とユーザー情報を設定
        setIsLoggedIn(true);
        setUserId(decoded.id); // デコードされたトークンからユーザーIDを設定
        setUserEmail(decoded.email);
        setUserName(decoded.name);
      } catch (err) {
        // トークンのデコードまたは検証エラーの場合
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

    fetchPosts(search); // 認証状態確認後、現在の検索キーワードで投稿をフェッチ
  }, [fetchPosts, search, router]); // 依存関係が変更された場合にのみ実行

  /**
   * 投稿を削除するハンドラー関数。
   * @param id 削除する投稿のID
   */
  const handleDeletePost = async (id: number) => {
    if (!confirm(dict.confirmDelete)) return; // 削除確認ダイアログ

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/"); // トークンがない場合、ログインページへリダイレクト
        return;
      }

      const res = await fetch(`/api/posts/${id}`, { // 投稿削除APIエンドポイント
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`, // 認証ヘッダーにトークンを含める
        },
      });

      // API応答のステータスチェック
      if (!res.ok) {
        // 認証エラーまたは権限エラーの場合
        if (res.status === 401 || res.status === 403) {
          console.error("削除API認証失敗: トークンがないか無効です。");
          localStorage.removeItem("token");
          router.push("/");
          return;
        }
        const errorData = await res.json(); // エラー応答をJSONとしてパース
        throw new Error(errorData.error || dict.deleteFail); // エラーメッセージをスロー
      }

      fetchPosts(search); // 削除成功後、投稿リストを再フェッチ
    } catch (error) {
      console.error("投稿の削除に失敗しました:", error); // 削除失敗ログ
    }
  };

  /**
   * ログアウト処理ハンドラー。
   * ローカルストレージからトークンを削除し、関連する状態をリセットしてログインページへリダイレクトします。
   */
  const handleLogout = () => {
    localStorage.removeItem("token"); // トークンをローカルストレージから削除
    setIsLoggedIn(false);
    setUserId(null);
    setUserEmail(null);
    setUserName(null);
    router.push("/"); // ルートパス（ログインページ）へリダイレクト
  };

  /**
   * 作成日時をフォーマットする関数。
   * 24時間以内であれば相対時間、それ以外であれば年月日形式で表示します。
   * @param dateString 日付文字列
   * @returns フォーマットされた日付文字列
   */
  const formatCreatedAt = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 1000 * 60 * 60 * 24) {
      // 現在は韓国語(ko)ロケールを使用。日本語(ja)を使用するにはjaロケールをインポートし、locale: ja に変更してください。
      return formatDistanceToNow(date, { addSuffix: true, locale: ko }); 
    }

    return format(date, "yyyy.MM.dd");
  };

  /**
   * いいねボタンクリック時のハンドラー。
   * いいねの追加/取り消しを処理し、UIを更新します。
   * @param postId いいね対象の投稿ID
   */
  const handleLikeToggle = async (postId: number) => {
    // ログインしていない場合、処理を中断しログインページへリダイレクト
    if (!isLoggedIn || userId === null) {
      alert("ログインが必要です。"); // ユーザーに通知
      router.push('/'); // ログインページへリダイレクト
      return;
    }

    try {
      const token = localStorage.getItem("token"); // トークンを取得
      if (!token) {
        alert("ログインセッションがありません。再度ログインしてください。");
        router.push('/');
        return;
      }

      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // API保護のためトークンを送信
        },
        body: JSON.stringify({ postId }), // 投稿IDをリクエストボディに含める
      });

      // エラー処理ロジック: 401 (認証なし) または 403 (権限なし) を明示的に処理
      if (res.status === 401 || res.status === 403) {
        alert("セッションが期限切れか、権限がありません。再度ログインしてください。");
        localStorage.removeItem("token"); // 無効なトークンを削除
        router.push('/'); // ログインページへリダイレクト
        return;
      }

      // その他のサーバーエラーの場合
      if (!res.ok) {
        const errorData = await res.json();
        // 409 Conflict はすでにいいね済みであることを意味
        if (res.status === 409) {
          console.warn("すでにいいね済み、または同時いいね試行です。");
          // alert("すでにいいねをされています！"); // ユーザーへの通知を有効にする場合はこの行のコメントを解除
        }
        // それ以外のすべてのサーバーエラー
        throw new Error(errorData.error || `サーバーエラーが発生しました: ${res.status} ${res.statusText}`);
      }

      const { message, newLikeStatus } = await res.json(); // 成功メッセージと新しいいいね状態を取得
      console.log(message); // "いいねしました！" または "いいねを取り消しました！"

      // UIを即時更新 (オプティミスティックアップデート)
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post.id === postId) {
            // いいね数の更新
            return {
              ...post,
              likes_count: newLikeStatus ? post.likes_count + 1 : post.likes_count - 1,
            };
          }
          return post;
        })
      );
      // 必要であれば、`fetchPosts(search);` を呼び出して全体データを同期することも可能ですが、
      // 現在はオプティミスティックアップデートで十分です。
    } catch (e: any) { // エラーをany型でキャッチ
      alert(`いいねの処理に失敗しました: ${e.message}`); // いいね処理失敗を通知
      console.error("いいねの切り替えに失敗しました:", e);
      // エラー発生時、データ全体を再フェッチしてUIをロールバックする効果
      fetchPosts(search);
    }
  };


  return (
    // 最上位のdiv: Flexboxレイアウト、最小の高さ、現在のテーマに応じた背景色とテキスト色を適用
    <div className={`flex min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
      {/* サイドバー: 固定幅、濃い背景、白いテキスト、高さ100% */}
      <aside className="w-48 bg-gray-800 text-white p-4 fixed h-full flex flex-col items-center">
        {/* ログイン中の場合、ログアウトボタンを表示 */}
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded w-full text-center"
          >
            {dict.logout}
          </button>
        )}
      </aside>

      {/* メインコンテンツエリア: サイドバーの幅を考慮して左マージンを設定し、パディングを追加 */}
      <div className="flex-1 ml-48 p-8">
        {/* 言語切り替えボタンとダークモードトグルボタンのコンテナ: 右上絶対位置、フレックスボックスで配置 */}
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

          {/* テーマ切り替えボタンコンポーネント */}
          <ThemeToggleButton />
        </div>

        {/* ページタイトル */}
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-gray-100">
          {dict.title}
        </h2>

        {/* ログインユーザーへの歓迎メッセージ (ログイン中かつユーザー名がある場合) */}
        {isLoggedIn && userName && (
          <p className="text-center text-gray-700 dark:text-gray-300 mb-4">
            {dict.welcome} {userName}さん！
          </p>
        )}

        {/* 新規投稿ボタン (中央寄せ) */}
        <div className="flex justify-center mb-4">
          <button
            onClick={() => router.push("/blog/new")}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            {dict.create}
          </button>
        </div>

        {/* 検索およびソートUIコンテナ: 中央寄せ、要素間にスペース */}
        <div className="flex justify-center mb-4 space-x-2">
          {/* 検索入力欄 */}
          <input
            type="text"
            placeholder={dict.searchPlaceholder}
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
                setSearch(""); // 検索キーワードをクリア
                fetchPosts(""); // 全ての投稿を再フェッチ
              }}
              className="bg-gray-300 hover:bg-gray-400 text-black dark:bg-gray-700 dark:text-white px-4 py-2 rounded"
            >
              {dict.showAll}
            </button>
          )}

          {/* ソートボタン群: 新しい順/古い順 */}
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
            // 投稿がない場合のメッセージ
            <p className="text-center text-gray-500 dark:text-gray-400">{dict.noPosts}</p>
          ) : (
            // 各投稿アイテムのレンダリング
            posts.map((post) => (
              <li key={post.id} className="border border-gray-200 dark:border-gray-700 p-4 rounded shadow flex flex-col md:flex-row items-start md:items-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                {/* 投稿タイトルと内容、投稿者、作成日時 */}
                <div className="flex-grow">
                  {/* 投稿タイトル (クリックで詳細ページへ遷移) */}
                  <h3
                    className="text-xl font-bold mb-2 cursor-pointer hover:text-blue-600 transition-colors duration-200"
                    onClick={() => router.push(`/blog/${post.id}`)}
                  >
                    {post.title}
                  </h3>
                  {/* 投稿内容の最初の行をプレビューとして表示 (2行まで) */}
                  <p className="text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">{post.content.split('\n')[0]}</p>
                  {/* 投稿者名と作成日時 */}
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

                {/* いいねボタンとカウント */}
                <div className="flex items-center mt-2 md:ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // 親要素のクリックイベントを防ぐ
                      handleLikeToggle(post.id);
                    }}
                    className="flex items-center text-red-500 hover:text-red-700 transition-colors duration-200 focus:outline-none"
                    disabled={!isLoggedIn} // 未ログイン時はボタンを無効化
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 mr-1"
                      fill="currentColor" // 現在は常に塗りつぶされたハート。実際はいいねの状態に応じて変更可能
                      viewBox="0 0 24 24"
                    >
                      {/* 塗りつぶされたハートアイコンのパス */}
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    いいね
                  </button>
                  {/* いいね数表示 */}
                  <span className="ml-2 text-gray-700 dark:text-gray-300 font-semibold">{post.likes_count}</span>
                </div>

              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}