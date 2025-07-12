"use client";

import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ユーザーデータ の型定義
interface User {
  id: string;
  email: string;
  name?: string;
}

// 認証コンテキストの型定義
interface AuthContextType {
  user: User | null;
  loading: boolean;
  checkAuth: () => Promise<void>; // 認証状態を再チェックする関数
  login: (token: string, userData: User) => void;
  logout: () => void;
}

// AuthContext の作成 (デフォルト値は null)
const AuthContext = createContext<AuthContextType | null>(null);

// localStorage 안전하게 사용하는 헬퍼 함수들
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
};

const removeToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // 初期ロードはtrue 
  const [mounted, setMounted] = useState(false); // 클라이언트 마운트 상태 추가

  const router = useRouter();

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true);
  }, []);

  // 認証状態をチェックする関数
  const checkAuth = useCallback(async () => {
    // 클라이언트에서만 실행
    if (!mounted) return;

    setLoading(true); // checkAuth が呼ばれるたびにローディングを開始
    try {
      const token = getToken();
      if (!token) {
        setUser(null);
        return;
      }

      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        removeToken(); // トークンが無効な場合は削除
        setUser(null);
      }
    } catch (error) {
      console.error('認証チェックエラー:', error);
      removeToken();
      setUser(null);
    } finally {
      setLoading(false); // checkAuth が完了したらローディングを終了
    }
  }, [mounted]); // mounted를 의존성에 추가

  // ログイン関数
  const login = (token: string, userData: User) => {
    setToken(token);
    setUser(userData);
    router.push('/blog'); // ログイン後、ブログ一覧ページへリダイレクト
  };

  // ログアウト関数
  const logout = () => {
    removeToken();
    setUser(null);
    router.push('/'); // 로그인 페이지로 리다이렉트
  };

  // コンポーネントのマウント時に認証状態をチェック
  useEffect(() => {
    if (mounted) {
      checkAuth();
    }
  }, [checkAuth, mounted]); // mounted가 true가 된 후에 checkAuth 실행

  // コンテキストプロバイダーの提供する値
  const value = { user, loading, checkAuth, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// useAuth カスタムフック
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider'); // AuthProvider の外で使われた場合の警告
  }
  return context;
}