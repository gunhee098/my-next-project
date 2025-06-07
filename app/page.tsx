// app/page.tsx

import { redirect } from 'next/navigation'; // Next.jsのredirect関数をインポート

// ルートパス("/")にアクセスがあった際に実行されるコンポーネント
// ログインページ("/auth/login")へリダイレクトする役割を担います。
export default function Home() {
  // ユーザーをログインページへ即座にリダイレクト
  redirect('/auth/login');
}