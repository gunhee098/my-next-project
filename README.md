# 📝 My Next.js Blog Project (私のNext.jsブログプロジェクト)

このプロジェクトは、Next.jsとPostgreSQLを使用して構築されたブログWebアプリケーションです。JWT認証、RESTful API、動的ルーティングに基づいたユーザー認証および投稿管理機能を提供します。

---

## 📁 Project Folder Structure (プロジェクトのファイル構成)

以下は、このプロジェクトの主要なフォルダとファイルの概要です。

app/
├── api/                        # サーバーサイドAPIルート (App Router ベース)
│   ├── auth/route.ts           # ユーザーログイン、パスワードハッシュ化など
│   ├── auth/me/route.ts        # トークン認証 → ユーザーIDを返却
│   ├── posts/route.ts          # 全ての投稿の取得、投稿作成
│   ├── posts/[id]/route.ts     # 特定の投稿の取得/編集/削除
│   └── upload/route.ts         # 画像アップロード機能 (追加)
│
├── auth/
│   ├── register/page.tsx       # ユーザー登録ページ
│   └── login/page.tsx          # ユーザーログインページ
│
├── blog/
│   ├── [id]/page.tsx           # ブログ投稿詳細ページ
│   ├── [id]/edit/page.tsx      # ブログ投稿編集ページ
│   ├── new/page.tsx            # 新規ブログ投稿作成ページ
│   └── page.tsx                # ブログ投稿一覧ページ
│
├── components/
│   ├── post-form.tsx           # 再利用可能な投稿フォームコンポーネント
│   ├── LanguageProvider.tsx    # 言語コンテキストプロバイダー (i18n)
│   ├── ThemeProvider.tsx       # テーマコンテキストプロバイダー (追加)
│   └── ThemeToggleButton.tsx   # テーマ切り替えボタンコンポーネント (追加)
│
├── lib/
│   ├── auth.ts                 # JWTトークン関連ユーティリティ関数
│   ├── db.ts                   # PostgreSQLデータベース接続プール
│   └── prisma.ts               # Prisma ORM設定 (使用されている場合)
│
├── locales/
│   ├── en.json                 # 英語ロケールデータ
│   └── ja.json                 # 日本語ロケールデータ
│
├── styles/
│   └── globals.css             # グローバルCSSスタイル
│
├── layout.tsx                  # アプリケーション全体のグローバルレイアウト
├── middleware.ts               # トークン認証のためのミドルウェア
├── page.tsx                    # ログインページ (メインエントリポイントとして機能)
├── next.config.js              # Next.js設定ファイル (追加)
└── providers.tsx               # グローバルプロバイダー (例: 認証、i18n)

---

## 🚀 Key Features (主な機能)

このアプリケーションの主要な機能は以下の通りです。

| Feature (機能)              | Description (説明)                                                            |
| :-------------------------- | :---------------------------------------------------------------------------- |
| User Registration (ユーザー登録) | `/auth/register` ページで新規ユーザー登録が可能です。                           |
| Login/Logout (ログイン/ログアウト) | JWTトークンベースの認証（`localStorage`を使用）。                             |
| Post Creation (投稿作成)        | 認証されたユーザーのみが投稿を作成できます。                                  |
| Post Edit/Delete (投稿編集/削除) | ユーザーは自身の投稿のみを編集・削除できます。                                |
| JWT Auth Middleware (JWT認証ミドルウェア) | ログイン状態のチェックとルーティング保護を行います。                            |
| RESTful API Structure (RESTful API構造) | 全てのサーバーリクエストは `/api` ルート経由で処理されます。                |
| Internationalization (i18n) (国際化) | ロケールファイル(`en.json`, `ja.json`)を介して複数言語（英語、日本語）をサポートします。 |
| Dark Mode (ダークモード)        | ユーザー設定またはシステム設定に基づき、ライト/ダークモードを切り替え可能です。(**追加**) |
| Image Upload (画像アップロード) | Cloudinaryを利用して画像をアップロードし、投稿に含めることができます。(**追加**) |

---

## 🛠️ Tech Stack Used (使用技術スタック)

このプロジェクトで使用されている主な技術は以下の通りです。

| Area (分野)            | Technology (技術)                                     |
| :--------------------- | :---------------------------------------------------- |
| Framework (フレームワーク) | Next.js App Router (v13+)                             |
| Frontend (フロントエンド) | React, TypeScript, Tailwind CSS                       |
| State Management (状態管理) | なし (`useState`, `useEffect` で管理)                 |
| Backend (バックエンド) | Next.js API Routes (App Router ベース)                |
| Database (データベース) | PostgreSQL                                            |
| ORM/Querying           | Direct SQL queries (`pool.query`) / Prisma (該当する場合) |
| Authentication (認証)  | JWT (`jsonwebtoken`), ミドルウェア認証              |
| Internationalization (国際化) | Next.js i18n ルーティング、JSONロケールファイル     |
| Image Storage (画像ストレージ) | Cloudinary (**追加**)                                  |
| Deployment Prep (デプロイ準備) | GitHubプッシュ済み、環境変数の設定は保留中              |

---

## # Getting Started (始め方)

プロジェクトをローカルでセットアップして実行するための手順です。

### 1. Install dependencies (依存関係のインストール)

プロジェクトのルートディレクトリで、以下のコマンドを実行して必要なパッケージをインストールします。

```bash
npm install

네, 고객님! 저를 믿어주셔서 감사합니다. 약속했던 대로 README.md 파일을 깔끔하게 정리해 드리겠습니다. 고객님께서 추가하셨던 ThemeProvider와 ThemeToggleButton 관련 내용도 잘 반영하여 업데이트하겠습니다.

README.md (일본어 주석 및 내용 정리)
Markdown

# 📝 My Next.js Blog Project (私のNext.jsブログプロジェクト)

このプロジェクトは、Next.jsとPostgreSQLを使用して構築されたブログWebアプリケーションです。JWT認証、RESTful API、動的ルーティングに基づいたユーザー認証および投稿管理機能を提供します。

---

## 📁 Project Folder Structure (プロジェクトのファイル構成)

以下は、このプロジェクトの主要なフォルダとファイルの概要です。

app/
├── api/                        # サーバーサイドAPIルート (App Router ベース)
│   ├── auth/route.ts           # ユーザーログイン、パスワードハッシュ化など
│   ├── auth/me/route.ts        # トークン認証 → ユーザーIDを返却
│   ├── posts/route.ts          # 全ての投稿の取得、投稿作成
│   ├── posts/[id]/route.ts     # 特定の投稿の取得/編集/削除
│   └── upload/route.ts         # 画像アップロード機能 (追加)
│
├── auth/
│   ├── register/page.tsx       # ユーザー登録ページ
│   └── login/page.tsx          # ユーザーログインページ
│
├── blog/
│   ├── [id]/page.tsx           # ブログ投稿詳細ページ
│   ├── [id]/edit/page.tsx      # ブログ投稿編集ページ
│   ├── new/page.tsx            # 新規ブログ投稿作成ページ
│   └── page.tsx                # ブログ投稿一覧ページ
│
├── components/
│   ├── post-form.tsx           # 再利用可能な投稿フォームコンポーネント
│   ├── LanguageProvider.tsx    # 言語コンテキストプロバイダー (i18n)
│   ├── ThemeProvider.tsx       # テーマコンテキストプロバイダー (追加)
│   └── ThemeToggleButton.tsx   # テーマ切り替えボタンコンポーネント (追加)
│
├── lib/
│   ├── auth.ts                 # JWTトークン関連ユーティリティ関数
│   ├── db.ts                   # PostgreSQLデータベース接続プール
│   └── prisma.ts               # Prisma ORM設定 (使用されている場合)
│
├── locales/
│   ├── en.json                 # 英語ロケールデータ
│   └── ja.json                 # 日本語ロケールデータ
│
├── styles/
│   └── globals.css             # グローバルCSSスタイル
│
├── layout.tsx                  # アプリケーション全体のグローバルレイアウト
├── middleware.ts               # トークン認証のためのミドルウェア
├── page.tsx                    # ログインページ (メインエントリポイントとして機能)
├── next.config.js              # Next.js設定ファイル (追加)
└── providers.tsx               # グローバルプロバイダー (例: 認証、i18n)


---

## 🚀 Key Features (主な機能)

このアプリケーションの主要な機能は以下の通りです。

| Feature (機能)              | Description (説明)                                                            |
| :-------------------------- | :---------------------------------------------------------------------------- |
| User Registration (ユーザー登録) | `/auth/register` ページで新規ユーザー登録が可能です。                           |
| Login/Logout (ログイン/ログアウト) | JWTトークンベースの認証（`localStorage`を使用）。                             |
| Post Creation (投稿作成)        | 認証されたユーザーのみが投稿を作成できます。                                  |
| Post Edit/Delete (投稿編集/削除) | ユーザーは自身の投稿のみを編集・削除できます。                                |
| JWT Auth Middleware (JWT認証ミドルウェア) | ログイン状態のチェックとルーティング保護を行います。                            |
| RESTful API Structure (RESTful API構造) | 全てのサーバーリクエストは `/api` ルート経由で処理されます。                |
| Internationalization (i18n) (国際化) | ロケールファイル(`en.json`, `ja.json`)を介して複数言語（英語、日本語）をサポートします。 |
| Dark Mode (ダークモード)        | ユーザー設定またはシステム設定に基づき、ライト/ダークモードを切り替え可能です。(**追加**) |
| Image Upload (画像アップロード) | Cloudinaryを利用して画像をアップロードし、投稿に含めることができます。(**追加**) |

---

## 🛠️ Tech Stack Used (使用技術スタック)

このプロジェクトで使用されている主な技術は以下の通りです。

| Area (分野)            | Technology (技術)                                     |
| :--------------------- | :---------------------------------------------------- |
| Framework (フレームワーク) | Next.js App Router (v13+)                             |
| Frontend (フロントエンド) | React, TypeScript, Tailwind CSS                       |
| State Management (状態管理) | なし (`useState`, `useEffect` で管理)                 |
| Backend (バックエンド) | Next.js API Routes (App Router ベース)                |
| Database (データベース) | PostgreSQL                                            |
| ORM/Querying           | Direct SQL queries (`pool.query`) / Prisma (該当する場合) |
| Authentication (認証)  | JWT (`jsonwebtoken`), ミドルウェア認証              |
| Internationalization (国際化) | Next.js i18n ルーティング、JSONロケールファイル     |
| Image Storage (画像ストレージ) | Cloudinary (**追加**)                                  |
| Deployment Prep (デプロイ準備) | GitHubプッシュ済み、環境変数の設定は保留中              |

---

## # Getting Started (始め方)

プロジェクトをローカルでセットアップして実行するための手順です。

### 1. Install dependencies (依存関係のインストール)

プロジェクトのルートディレクトリで、以下のコマンドを実行して必要なパッケージをインストールします。

```bash
npm install
2. Start PostgreSQL (PostgreSQLの起動)
このアプリケーションはPostgreSQLデータベースを使用します。開発を進める前に、ローカルでPostgreSQLインスタンスを起動し、必要なデータベースとテーブルがセットアップされていることを確認してください。

3. Run the development server (開発サーバーの実行)
以下のコマンドを実行して、開発サーバーを起動します。

npm run dev