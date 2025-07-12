// 📂 app/layout.tsx

import { Inter } from "next/font/google"; // Google FontsのInterをインポート
import "./styles/globals.css"; // グローバルCSSをインポート (app/styles/globals.css 경로)

// 필요에 따라 고객님 프로젝트에 실제 존재하는 컴포넌트로 변경해주세요.
// 이 코드에서는 ThemeProvider와 LanguageProvider가 있다고 가정합니다.
import { LanguageProvider } from "@/components/LanguageProvider"; // LanguageProvider를 임포트
import { ThemeProvider } from "@/components/ThemeProvider"; // ThemeProvider를 임포트

import { AuthProvider } from '@/hooks/useAuth'; // AuthProvider를 임포트

const inter = Inter({ subsets: ["latin"] }); // Interフォントのサブセットを設定

/**
 * メタデータ定義
 * Next.jsのドキュメントヘッド情報（タイトル、ディスクリプションなど）を設定します。
 */
export const metadata = {
  title: "My Blog App", // ページのタイトル
  description: "A simple blog application built with Next.js", // ページの説明
};

/**
 * ルートレイアウトコンポーネント
 * アプリケーションの全てのページをラップし、共通の構造とプロバイダーを提供します。
 * @param { children: React.ReactNode } 子要素 (ページコンポーネントなど)
 * @returns React.FC
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja"> 
      <body className={inter.className}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider> {/* AuthProvider로 children을 감쌉니다. */}
              {children} {/* 各ページコンポーネントがここにレンダリングされます */}
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}