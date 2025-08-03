// 📂 hooks/useAuth.tsx

"use client"; // このファイルがクライアントサイドで実行されることを宣言します。

import { useEffect, useState, createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// ユーザーデータ の型定義
interface User {
  id: string;
  email: string;
  name?: string; // オプションのプロパティ
}

// 認証コンテキストの型定義
interface AuthContextType {
  user: User | null;         // ログイン中のユーザー情報、またはnull
  loading: boolean;          // 認証状態の確認中かどうか
  checkAuth: () => Promise<void>; // 認証状態を再確認する関数
  login: (token: string, userData: User) => void; // ログイン処理を行う関数
  logout: () => void;        // ログアウト処理を行う関数
}

// AuthContext の作成 (デフォルト値は null)
const AuthContext = createContext<AuthContextType | null>(null);

// localStorage を安全に使用するためのヘルパー関数群 (サーバーサイドレンダリングとの互換性のため)
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null; // window オブジェクトがない場合 (SSR時) は null を返す
  return sessionStorage.getItem("token") || localStorage.getItem("token");
};

const setToken = (token: string): void => {
  if (typeof window === 'undefined') return; // window オブジェクトがない場合 (SSR時) は何もしない
  sessionStorage.setItem('token', token);
};

const removeToken = (): void => {
  if (typeof window === 'undefined') return; // window オブジェクトがない場合 (SSR時) は何もしない
  sessionStorage.removeItem('token');
};

/**
 * AuthProvider コンポーネント
 * アプリケーションの認証状態を管理し、子コンポーネントに認証コンテキストを提供します。
 * @param {ReactNode} children - ラップする子React要素
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);         // ユーザーの状態
  const [loading, setLoading] = useState<boolean>(true);       // ローディング状態
  const [mounted, setMounted] = useState<boolean>(false);       // クライアントでマウントされたかどうかの状態

  const router = useRouter(); // Next.jsルーターフックを初期化

  // コンポーネントがクライアントサイドでマウントされたときに mounted を true に設定
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * 認証状態をチェックする非同期関数。
   * トークンが存在するか、有効かを検証し、ユーザー情報を設定します。
   */
  const checkAuth = useCallback(async () => {
    // コンポーネントがマウントされていない場合は何もしない (SSR時のエラー防止)
    if (!mounted) {
      setLoading(false);
      return;
    }

    setLoading(true); // 認証チェック開始時にローディング状態を設定
    try {
      const token = getToken(); // ローカルストレージからトークンを取得
      if (!token) {
        setUser(null); // トークンがない場合、ユーザーをnullに設定
        return;
      }

      // 認証APIエンドポイントにトークンを送信してユーザー情報を取得
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`, // Authorizationヘッダーにトークンを含める
        },
      });

      if (res.ok) {
        const userData = await res.json(); // ユーザーデータをJSONとしてパース
        // ユーザーデータが実際に変更された場合のみ状態を更新し、不要な再レンダリングを防ぎます。
        setUser(prevUser => {
          if (!prevUser || prevUser.id !== userData.id) {
            return userData;
          }
          return prevUser;
        });
      } else {
        removeToken(); // トークンが無効な場合、ローカルストレージから削除
        setUser(null); // ユーザーをnullに設定
      }
    } catch (error) {
      console.error('認証チェックエラー:', error);
      removeToken(); // エラー発生時もトークンを削除
      setUser(null); // ユーザーをnullに設定
    } finally {
      setLoading(false); // 認証チェック完了時にローディング状態を解除
    }
  }, [mounted]); // mounted が変更された場合にのみ関数を再生成

  /**
   * ログイン処理を行う関数。
   * トークンとユーザーデータを設定し、ブログページへリダイレクトします。
   * @param {string} token - JWTトークン
   * @param {User} userData - ログインユーザーのデータ
   */
  const login = useCallback((token: string, userData: User) => {
    setToken(token); // トークンをローカルストレージに保存
    setUser(userData); // ユーザー状態を設定
    
    // setTimeout を使用して、非同期的にページ移動および再読み込みを処理します。
    // これにより、状態更新が完全に反映された後にルーターの動作が実行されるのを助けます。
    setTimeout(() => {
      router.push('/blog');    // ブログページへリダイレクト
      router.refresh();       // ページのデータを再フェッチして最新の状態にする
    }, 100); // 短い遅延を設定
  }, [router]);

  /**
   * ログアウト処理を行う関数。
   * トークンとユーザー状態をクリアし、ログインページへリダイレクトします。
   */
  const logout = useCallback(() => {
    removeToken(); // トークンをローカルストレージから削除
    setUser(null); // ユーザー状態をクリア
    
    // setTimeout を使用して、非同期的にページ移動および再読み込みを処理します。
    setTimeout(() => {
      router.push('/');       // ルートパス（ログインページ）へリダイレクト
      router.refresh();       // ページのデータを再フェッチして最新の状態にする
    }, 100); // 短い遅延を設定
  }, [router]);

  // コンポーネントがマウントされた後、初回認証チェックを実行します。
  useEffect(() => {
    if (mounted) {
      checkAuth();
    }
  }, [checkAuth, mounted]);

  // ブラウザのフォーカスイベントや visibility 変更時に認証状態を再確認します。
  useEffect(() => {
    if (!mounted) return; // クライアントでマウントされていない場合は何もしない

    const handleFocus = () => {
      checkAuth(); // ウィンドウがフォーカスされたときに認証チェック
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) { // ページが再び表示状態になったときに
        checkAuth();         // 認証チェック
      }
    };

    window.addEventListener('focus', handleFocus);                 // focus イベントリスナーを追加
    document.addEventListener('visibilitychange', handleVisibilityChange); // visibilitychange イベントリスナーを追加

    // クリーンアップ関数: コンポーネントのアンマウント時にイベントリスナーを削除
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mounted, checkAuth]); // 依存配列に mounted と checkAuth を含める

  // AuthContext に提供する値を useMemo でメモ化し、不要な再計算を防ぎます。
  const value = useMemo(() => ({ 
    user, 
    loading, 
    checkAuth, 
    login, 
    logout 
  }), [user, loading, checkAuth, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ✅ この部分が不足していました！useAuth 훅を export します。
/**
 * AuthContext から認証コンテキストを取得するためのカスタムフック。
 * AuthProvider の内部で使用されない場合、エラーをスローします。
 * @returns {AuthContextType} 認証コンテキストの値
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    // AuthProvider の外部で useAuth が呼び出された場合のエラーハンドリング
    throw new Error('useAuth は AuthProvider 内で使用する必要があります。');
  }
  return context;
}