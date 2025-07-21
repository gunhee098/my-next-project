// 📂 app/blog/page.tsx
"use client"; // このファイルがクライアントコンポーネントであることを宣言します。

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation"; // Next.jsのルーターフックをインポートします。
import Link from "next/link"; // Linkコンポーネントをインポートします。
import { jwtDecode } from "jwt-decode"; // JWTトークンをデコードするためのライブラリ
import { formatDistanceToNow, format } from "date-fns"; // 日付フォーマット用のライブラリ
import { ja } from "date-fns/locale"; // 日本語ロケール(ja)を使用します。

import { useLang } from "@/components/LanguageProvider"; // 言語プロバイダーをインポートします。
import en from "@/locales/en.json"; // 英語ロケールデータ
import jaDict from "@/locales/ja.json"; // 日本語ロケールデータ (jaDictとしてインポートし、変数名衝突を避ける)

import { useTheme } from "@/components/ThemeProvider"; // テーマプロバイダーからuseThemeフックをインポートします。
import ThemeToggleButton from "@/components/ThemeToggleButton"; // テーマ切り替えボタンコンポーネントをインポートします。

// 投稿データのインターフェース定義 (Prismaのスキーマに合わせる)
interface Post {
  id: string; // PrismaのUUIDに合わせ string タイプ
  title: string;
  content: string;
  userId: string; // Prismaの userId (camelCase) に合わせる
  createdAt: string; // Prismaの createdAt (camelCase) に合わせる。DateオブジェクトではなくAPIから文字列で来る想定
  username: string; // user.name を通して取得
  imageUrl?: string | null; // image_url ではなく imageUrl (Prismaモデルそのまま)
  _count: { // Prismaの集計結果に合わせる
    comments: number; // コメント数
    likes: number;    // いいね数
  };
}

// デコードされたJWTトークンのインターフェース定義 (ユーザーIDもstringに合わせる)
interface DecodedToken {
  id: string;    // ユーザーID (PrismaのUUIDに合わせ string タイプ)
  email: string;
  name: string;
  iat: number;   // トークン発行時間 (Issued At)
  exp: number;   // トークン有効期限 (Expiration Time)
}

/**
 * ブログページコンポーネント
 * 投稿の表示、検索、ソート、作成、編集、削除機能を提供します。
 * ユーザー認証、ダークモード/言語切り替えにも対応します。
 * @returns React.FC
 */
export default function BlogPage() {
  const router = useRouter(); // Next.jsルーターフックを初期化します。
  const [posts, setPosts] = useState<Post[]>([]); // 投稿リストの状態管理
  const [isLoggedIn, setIsLoggedIn] = useState(false); // ログイン状態の管理
  const [userId, setUserId] = useState<string | null>(null); // ログインユーザーIDの管理 (stringに合わせる)
  const [userEmail, setUserEmail] = useState<string | null>(null); // ログインユーザーメールの管理
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest"); // 投稿ソート順の管理
  const [search, setSearch] = useState(""); // 検索キーワードの管理
  const [userName, setUserName] = useState<string | null>(null); // ログインユーザー名の管理

  const { lang, setLang } = useLang(); // 言語プロバイダーから現在の言語状態と設定関数を取得します。
  // 現在の言語に応じた辞書データを設定します。(jaDictとen)
  const dict = lang === "ja" ? jaDict : en;

  const { theme, toggleTheme } = useTheme(); // テーマプロバイダーから現在のテーマ状態とトグル関数を取得します。

  /**
   * 投稿を非同期でフェッチする関数。
   * 指定された検索キーワードとソート順に基づいて投稿を取得します。
   * @param {string} keyword - 検索キーワード (オプション)。デフォルトは空文字列。
   */
  const fetchPosts = useCallback(async (keyword = "") => {
    try {
      const queryParams = new URLSearchParams();
      // 検索キーワードがあればURLに追加します。
      if (keyword) {
        queryParams.append("search", encodeURIComponent(keyword));
      }
      // ソート順があればURLに追加します。
      if (sortOrder) {
        queryParams.append("orderBy", sortOrder);
      }

      // APIリクエストURLを構築します。
      const url = `/api/posts?${queryParams.toString()}`;

      // デバッグ用のログ出力
      console.log("--- fetchPosts デバッグ ---");
      console.log("フェッチするURL:", url);
      console.log("現在の検索キーワード:", keyword);
      console.log("現在のソート順:", sortOrder);

      // ローカルストレージからJWTトークンを取得します。
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      // トークンがあればAuthorizationヘッダーに設定します。
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // APIリクエストを実行します。
      const res = await fetch(url, {
        cache: "no-store", // キャッシュを使用しない設定
        headers: headers   // リクエストヘッダーを設定
      });

      // 認証エラー (401) または権限エラー (403) の場合のハンドリング
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

      // サーバー応答が正常でない場合 (res.okがfalseの場合)
      if (!res.ok) {
        // エラー応答をJSONとしてパースし、失敗した場合は不明なエラーメッセージを設定します。
        const errorData = await res.json().catch(() => ({ error: '不明なエラー' }));
        throw new Error(errorData.error || "サーバーからの応答が不正です。");
      }

      const data: Post[] = await res.json(); // 応答をJSONとしてパース
      setPosts(data); // 投稿リストを更新
      console.log("投稿が正常にフェッチされました。件数:", data.length);
    } catch (error) {
      console.error("投稿の読み込みに失敗しました:", error);
    }
  }, [sortOrder, router]); // sortOrderとrouterが変更された場合にのみ関数を再生成します。

  /**
   * コンポーネントマウント時および依存関係の変更時に実行される副作用フック。
   * ユーザー認証状態の確認と初期投稿のフェッチを行います。
   */
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token); // トークンをデコードします。
        const currentTime = Date.now() / 1000; // 現在時刻を秒単位で取得します。

        // トークンの有効期限をチェックします。
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

        // ログイン状態とユーザー情報を設定します。
        setIsLoggedIn(true);
        setUserId(decoded.id); // デコードされたトークンからユーザーIDを設定 (string)
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
      // トークンがない場合、ログアウト状態に設定し、ルートパスへリダイレクトします。
      setIsLoggedIn(false);
      setUserId(null);
      setUserEmail(null);
      setUserName(null);
      router.push("/");
      return;
    }

    // 認証状態確認後、現在の検索キーワードで投稿をフェッチします。
    fetchPosts(search);
  }, [fetchPosts, search, router]); // 依存関係が変更された場合にのみ実行されます。

  /**
   * 投稿を削除するハンドラー関数。
   * @param {string} id - 削除する投稿のID (stringに合わせる)
   */
  const handleDeletePost = async (id: string) => {
    // 削除確認ダイアログを表示します。ユーザーがキャンセルした場合は処理を中断します。
    if (!confirm(dict.confirmDelete)) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/"); // トークンがない場合、ログインページへリダイレクト
        return;
      }

      // 投稿削除APIエンドポイントを呼び出します。
      const res = await fetch(`/api/posts/${id}`, {
        method: "DELETE", // HTTP DELETE メソッドを使用
        headers: {
          Authorization: `Bearer ${token}`, // 認証ヘッダーにトークンを含める
        },
      });

      // API応答のステータスをチェックします。
      if (!res.ok) {
        // 認証エラー (401) または権限エラー (403) の場合
        if (res.status === 401 || res.status === 403) {
          console.error("削除API認証失敗: トークンがないか無効です。");
          localStorage.removeItem("token");
          router.push("/");
          return;
        }
        // エラー応答をJSONとしてパースし、失敗した場合は不明なエラーメッセージを設定します。
        const errorData = await res.json().catch(() => ({ error: '不明なエラー' }));
        throw new Error(errorData.error || dict.deleteFail); // エラーメッセージをスロー
      }

      fetchPosts(search); // 削除成功後、投稿リストを再フェッチしてUIを更新します。
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
   * @param {string} dateString - 日付文字列
   * @returns {string} フォーマットされた日付文字列
   */
  const formatCreatedAt = (dateString: string) => {
    const date = new Date(dateString); // 文字列をDateオブジェクトに変換します。

    // 日付が有効な値か確認する防御ロジック
    if (isNaN(date.getTime())) {
      console.error("🚨 無効な日付値が formatCreatedAt に渡されました:", dateString);
      return "日付情報なし"; // 無効な日付の場合に表示するテキスト
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 1000 * 60 * 60 * 24) { // 24時間以内であれば相対時間を表示
      return formatDistanceToNow(date, { addSuffix: true, locale: ja }); // 日本語ロケール(ja)を使用
    }

    return format(date, "yyyy.MM.dd"); // それ以上であれば「YYYY.MM.DD」形式で表示
  };

  /**
   * いいねボタンクリック時のハンドラー。
   * いいねの追加/取り消しを処理し、UIを更新します。
   * (注: この関数は現在、投稿リストページでは呼び出されず、詳細ページでのみ使用されることを想定しています。)
   * @param {string} postId - いいね対象の投稿ID (stringに合わせる)
   */
  // この handleLikeToggle 関数は、現在は投稿リストページでは呼び出されません。
  // この関数は app/blog/[id]/page.tsx (詳細ページ)でのみ使用されます。
  const handleLikeToggle = async (postId: string) => {
    // ログインしていない、またはユーザーIDが取得できていない場合、処理を中断しログインページへリダイレクトします。
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

      // いいねAPIを呼び出します。
      const res = await fetch('/api/likes', {
        method: 'POST', // POSTで固定 (サーバー側でトグル処理を行うため)
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // API保護のためトークンを送信
        },
        body: JSON.stringify({ postId }), // 投稿IDをリクエストボディに含める
      });

      // エラー処理ロジック: 401 (認証なし) または 403 (権限なし) を明示的に処理します。
      if (res.status === 401 || res.status === 403) {
        alert("セッションが期限切れか、権限がありません。再度ログインしてください。");
        localStorage.removeItem("token"); // 無効なトークンを削除
        router.push('/'); // ログインページへリダイレクト
        return;
      }

      // その他のサーバーエラーの場合
      if (!res.ok) {
        // JSONパース失敗に備えてエラーをキャッチします。
        const errorData = await res.json().catch(() => ({ error: '不明なエラー' }));
        if (res.status === 409) {
          console.warn("すでにいいね済み、または同時いいね試行です。");
        }
        throw new Error(errorData.error || `サーバーエラーが発生しました: ${res.status} ${res.statusText}`);
      }

      // サーバーから isLiked (いいね状態) とメッセージを受け取ります。
      const { message, isLiked } = await res.json();
      console.log(message); // "いいねしました！" または "いいねを取り消しました！"

      // UIを即時更新 (オプティミスティックアップデート)
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post.id === postId) {
            // いいね数を更新
            return {
              ...post,
              _count: {
                ...post._count,
                likes: isLiked ? post._count.likes + 1 : post._count.likes - 1, // サーバーが返したisLikedに基づいて更新
              },
            };
          }
          return post;
        })
      );
    } catch (e: any) { // エラーをany型でキャッチ
      alert(`いいねの処理に失敗しました: ${e.message}`); // いいね処理失敗を通知
      console.error("いいねの切り替えに失敗しました:", e);
      fetchPosts(search); // エラー発生時、全体データを再度取得してUIをロールバックします。
    }
  };


  return (
    // 最上位のdiv: Flexboxレイアウト、最小の高さ、現在のテーマに応じた背景色とテキスト色を適用します。
    <div className={`flex min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
      {/* サイドバー: 固定幅、濃い背景、白いテキスト、高さ100% */}
      <aside className="w-48 bg-gray-800 text-white p-4 fixed h-full flex flex-col items-center">
        {/* ログイン中の場合、ログアウトボタンを表示します。 */}
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded w-full text-center"
          >
            {dict.logout}
          </button>
        )}
      </aside>

      {/* メインコンテンツエリア: サイドバーの幅を考慮して左マージンを設定し、パディングを追加します。 */}
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
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                console.log("Enterキーが押されました！検索ワードで投稿をフェッチ中:", search);
                fetchPosts(search);
              }
            }}
          />
          {/* 検索ボタン */}
          <button
            onClick={() => {
              console.log("検索ボタンがクリックされました！検索ワードで投稿をフェッチ中:", search);
              fetchPosts(search);
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            {dict.search}
          </button>

          {/* 検索キーワードがある場合に表示される「すべて表示」ボタン */}
          {search && (
            <button
              onClick={() => {
                console.log("「すべて表示」ボタンがクリックされました！");
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
            onClick={() => {
              console.log("「新しい順」がクリックされました！");
              setSortOrder("latest");
            }}
            className={`px-4 py-2 rounded ${
              sortOrder === "latest" ? "bg-blue-600 text-white" : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white"
            }`}
          >
            {dict.latest}
          </button>
          <button
            onClick={() => {
              console.log("「古い順」がクリックされました！");
              setSortOrder("oldest");
            }}
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
              // post.id は string になっているはずなので、key にそのまま使用可能
              <li key={post.id} className="border border-gray-200 dark:border-gray-700 p-4 rounded shadow flex flex-col md:flex-row items-start md:items-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                {/* 投稿タイトルと内容、投稿者、作成日時 */}
                <div className="flex-grow">
                  {/* 投稿タイトル (クリックで詳細ページへ遷移) */}
                  {/* <h3 タグを Link コンポーネントで囲むのが Next.js の推奨方法です。 */}
                  <Link href={`/blog/${post.id}`} passHref>
                    <h3
                      className="text-xl font-bold mb-2 cursor-pointer hover:text-blue-600 transition-colors duration-200"
                      // onClick={() => router.push(`/blog/${post.id}`)} // Link 使用時はこの onClick は不要
                    >
                      {post.title}
                    </h3>
                  </Link>
                  {/* 投稿内容の最初の行をプレビューとして表示 (2行まで) */}
                  <p className="text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">{post.content.split('\n')[0]}</p>
                  {/* 投稿者名と作成日時 */}
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {dict.author}: {post.username} ・ {dict.date}: {post.createdAt ? formatCreatedAt(post.createdAt) : "日付情報なし"}
                  </p>
                </div>

                {/* 画像がある場合に表示 */}
                {post.imageUrl && (
                  <div className="md:ml-4 flex-shrink-0 mt-4 md:mt-0">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-24 h-24 object-cover rounded-md shadow-sm"
                    />
                  </div>
                )}

                {/* ログインユーザーが自身の投稿の場合に表示される編集・削除ボタン */}
                {userId === post.userId && (
                  <div className="mt-2 flex gap-2 md:ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // 親要素へのイベント伝播を防ぐ
                        router.push(`/blog/${post.id}/edit`);
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                    >
                      {dict.edit}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // 親要素へのイベント伝播を防ぐ
                        handleDeletePost(post.id);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                    >
                      {dict.delete}
                    </button>
                  </div>
                )}

                {/* いいねボタンとカウント - クリック不可に修正されました */}
                <div className="flex items-center mt-2 md:ml-4">
                  {/* <button> タグを <span> に変更し、onClick ハンドラーを削除します。 */}
                  <span
                    className="flex items-center text-red-500 cursor-default" // cursor-default を追加
                    // onClick={(e) => { e.stopPropagation(); handleLikeToggle(post.id); }} // この部分は削除
                    // disabled={!isLoggedIn} // span タグには disabled 属性がありません。
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 mr-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    いいね
                  </span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300 font-semibold">{post._count.likes}</span>
                </div>

              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}