My Blog App
このプロジェクトは、Next.js App Router (v13+) を使用して構築されたシンプルなブログアプリケーションです。ユーザー認証、投稿管理、コメント、いいね機能、国際化、ダークモードなど、現代のウェブアプリケーションに求められる基本的な機能を備えています。

📁 Project Folder Structure (プロジェクトのファイル構成)
以下は、このプロジェクトの主要なフォルダとファイルの概要です。

my-next-project/
├── .next/                   # Next.js のビルドおよびキャッシュ関連ファイル
├── app/
│   ├── api/                 # サーバーサイドAPIルート (Next.js App Router ベース)
│   │   ├── auth/            # 認証API
│   │   ├── comments/        # コメントAPI
│   │   ├── likes/           # いいねAPI
│   │   ├── posts/           # 投稿API
│   │   └── user/            # ユーザーAPI
│   │
│   ├── blog/
│   │   ├── [id]/            # 個別ブログ投稿ページ
│   │   ├── new/             # 新規ブログ投稿作成ページ
│   │   └── page.tsx         # ブログ投稿一覧ページ
│   │
│   ├── components/          # 再利用可能なReactコンポーネント群
│   ├── lib/                 # プロジェクト共通のユーティリティおよび設定ファイル
│   ├── locales/             # 国際化(i18n)のための言語データファイル
│   ├── register/            # ユーザー登録ページ
│   ├── styles/              # アプリケーション全体に適用されるグローバルCSSスタイル
│   ├── layout.tsx           # アプリケーション全体のグローバルレイアウト
│   ├── middleware.ts        # Next.js のミドルウェア
│   ├── page.tsx             # アプリケーションのメインエントリポイント (例: ログインページ)
│   └── providers.tsx        # グローバルなコンテキストプロバイダーをまとめるファイル
│
├── hooks/                   # カスタムReactフック
│   └── useAuth.ts
│
├── prisma/                  # Prisma ORM 関連ファイル
│   └── schema.prisma        # データベーススキーマ定義
│
├── public/                  # 静的ファイルを提供するためのディレクトリ
├── .env                     # 環境変数を定義するファイル
├── next.config.js           # Next.js の設定ファイル
├── package.json             # プロジェクトの依存関係とスクリプト
└── tsconfig.json            # TypeScript コンパイラ設定ファイル
🚀 Key Features (主な機能)
このアプリケーションの主要な機能は以下の通りです。

機能	説明
ユーザー登録	/register ページで新しいアカウントを作成できます。
ログイン/ログアウト	JWTトークンベースの認証システムにより安全なログインとログアウトが可能です。
投稿作成	認証されたユーザーのみが新しいブログ投稿を作成できます。
投稿編集/削除	ユーザーは自分が作成した投稿のみを編集・削除できます。
コメント機能	各投稿に対してコメントを投稿・閲覧でき、自分が投稿したコメントは削除できます。
JWT認証ミドルウェア	ログイン状態をチェックし、保護されたルートへのアクセスを制御します。
RESTful API構造	すべてのサーバーリクエストは /api ルート経由で処理され、クリーンなAPI設計です。
国際化 (i18n)	ロケールファイルを介して複数言語（英語、日本語）をサポートします。
ダークモード	ユーザー設定またはシステム設定に基づき、ライトモードとダークモードを切り替え可能です。
画像アップロード	Cloudinaryサービスを利用して画像を投稿に含めることができます。
いいね機能	各投稿に対していいねをしたり、いいねを取り消したりできます。
投稿検索	投稿のタイトルや内容を検索できます。

Google スプレッドシートにエクスポート
🛠️ Tech Stack Used (使用技術スタック)
このプロジェクトで使用されている主な技術は以下の通りです。

分野	技術
フレームワーク	Next.js App Router (v13+)
フロントエンド	React, TypeScript, Tailwind CSS
状態管理	なし (useState, useEffect を主に利用)
バックエンド	Next.js API Routes
データベース	PostgreSQL
ORM/クエリ	Prisma ORM
認証	JWT (jsonwebtoken), bcrypt, ミドルウェア認証
国際化	Next.js i18n, JSONロケールファイル
画像ストレージ	Cloudinary
日時フォーマット	date-fns

Google スプレッドシートにエクスポート
# Getting Started (始め方)
プロジェクトをローカル環境でセットアップし、実行するための詳細な手順です。

1. 前提条件 (Prerequisites)
このプロジェクトを実行するには、以下のソフトウェアがインストールされている必要があります。

Node.js: v18.x 以上を推奨します。

npm または Yarn: パッケージマネージャー。

PostgreSQL: ローカルデータベース。

2. リポジトリのクローン (Clone the Repository)
Bash

git clone [あなたのリポジトリのURL]
cd my-next-project
3. 依存関係のインストール (Install Dependencies)
Bash

npm install
# または yarn install
4. 環境変数の設定 (.env.local)
プロジェクトのルートディレクトリに、.env.local という名前のファイルを作成し、以下の環境変数を設定します。

コード スニペット

# データベース接続文字列 (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/your_database_name"

# JWTシークレットキー
JWT_SECRET="your_strong_jwt_secret_key"

# Cloudinary API設定
CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
CLOUDINARY_API_KEY="your_cloudinary_api_key"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret"
5. PostgreSQLデータベースのセットアップ (PostgreSQL Database Setup)
PostgreSQLサーバーの起動: ローカルでPostgreSQLサーバーが実行されていることを確認します。

データベースの作成: DATABASE_URL で指定したデータベースを作成します。

スキーマの同期: 以下のコマンドを実行してスキーマを同期させます。

Bash

npx prisma generate
npx prisma db push
6. 開発サーバーの実行 (Run the Development Server)
Bash

npm run dev
# または yarn dev
サーバーが起動すると、通常 http://localhost:3000 でアクセスできるようになります。

How to Use the Application (アプリケーションの使用方法)
アプリケーションが起動したら、以下の手順でブログ機能を利用できます。

アクセス: ブラウザで http://localhost:3000 にアクセスします。

ユーザー登録: /register にアクセスし、アカウントを登録します。

ログイン: 登録したメールアドレスとパスワードでログインします。

投稿作成: 「Create New Post」 ボタンから新しい投稿を作成します。

投稿編集/削除: 自分が作成した投稿に対して 「編集」 や 「削除」 が可能です。

コメント機能: 投稿詳細ページでコメントを閲覧・投稿できます。

いいね機能: 各投稿にあるいいねボタンをクリックして、いいねを追加/取り消しできます。

投稿検索: 検索バーにキーワードを入力して投稿を検索できます。

ログアウト: サイドバーの 「ログアウト」 ボタンをクリックします。







