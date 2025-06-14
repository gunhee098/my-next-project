// 📂 app/layout.tsx

import { Inter } from "next/font/google"; // Google FontsのInterをインポート
import "./styles/globals.css"; // グローバルCSSをインポート
import { LanguageProvider } from "@/components/LanguageProvider"; // LanguageProviderをインポート
import { ThemeProvider } from "@/components/ThemeProvider"; // ThemeProviderをインポート

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
    // HTMLルート要素。テーマ切り替えにより`dark`クラスが自動で追加/削除されます。
    // lang属性は日本語('ja')に設定することも可能です。
    <html> 
      <body className={inter.className}>
        {/* ThemeProviderでアプリケーション全体をラップし、テーマ機能を提供 */}
        <ThemeProvider>
          {/* LanguageProviderもThemeProvider内に配置し、言語切り替え機能を提供 */}
          <LanguageProvider>
            {children} {/* 各ページコンポーネントがここにレンダリングされます */}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}