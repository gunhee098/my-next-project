// app/layout.tsx

import "./styles/globals.css"; // グローバルCSSをインポート
import { ReactNode } from "react";
import Providers from "./providers"; // 💡 クライアントコンポーネントのプロバイダー群をインポート

// ルートレイアウトコンポーネント
// アプリケーション全体のHTML構造を定義し、共通のプロバイダーを適用します。
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // HTMLドキュメントのルート要素
    // lang属性はデフォルトで"en"に設定されていますが、必要に応じて動的に変更することも可能です。
    <html lang="en">
      <body>
        {/* 💡 すべてのクライアントサイドプロバイダーをここで提供 */}
        {/* LanguageProviderを含むProvidersコンポーネントが子要素をラップします。 */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}