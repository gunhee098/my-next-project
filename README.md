📁 Project Folder Structure (プロジェクトのファイル構成)
以下は、このプロジェクトの主要なフォルダとファイルの概要です。

my-next-project/
├── .next/                   # Next.js のビルドおよびキャッシュ関連ファイル
├── app/
│   ├── api/                 # サーバーサイドAPIルート (Next.js App Router ベース)
│   │   ├── auth/
│   │   │   └── me/route.ts      # GET /api/auth/me (認証トークンに基づきユーザー情報を返却)
│   │   ├── comments/
│   │   │   ├── [commentId]/route.ts # GET, DELETE /api/comments/[commentId] (特定のコメント取得/削除)
│   │   │   ├── likes/route.ts   # GET, POST /api/comments/likes (コメントへの「いいね」機能)
│   │   │   └── route.ts         # GET, POST /api/comments (コメント一覧取得、新規コメント作成)
│   │   ├── likes/
│   │   │   ├── status/route.ts  # GET /api/likes/status (ユーザーと投稿に基づくい「いいね」状態確認)
│   │   │   └── route.ts         # GET, POST /api/likes (投稿への「いいね」追加/削除)
│   │   ├── posts/
│   │   │   ├── [id]/route.ts    # GET, PUT, DELETE /api/posts/[id] (特定の投稿取得/編集/削除)
│   │   │   └── route.ts         # GET, POST /api/posts (投稿一覧取得、新規投稿作成)
│   │   ├── upload/route.ts      # POST /api/upload (画像アップロード処理)
│   │   └── user/route.ts        # GET, POST, PUT, DELETE /api/user (ユーザー情報管理)
│   │
│   ├── blog/
│   │   ├── [id]/
│   │   │   ├── edit/page.tsx    # 特定のブログ投稿編集ページ (/blog/[id]/edit)
│   │   │   └── page.tsx         # 特定のブログ投稿詳細ページ (/blog/[id])
│   │   ├── new/page.tsx         # 新しいブログ投稿作成ページ (/blog/new)
│   │   └── page.tsx             # ブログ投稿一覧ページ (/blog)
│   │
│   ├── components/              # 再利用可能なReactコンポーネント群
│   │   ├── LanguageProvider.tsx # アプリケーションの言語コンテキストプロバイダー
│   │   ├── post-form.tsx        # 投稿作成・編集用フォーム
│   │   ├── ThemeProvider.tsx    # アプリケーションのテーマコンテキストプロバイダー (ライト/ダークモード)
│   │   └── ThemeToggleButton.tsx# テーマを切り替えるUIボタン
│   │
│   ├── lib/                     # プロジェクト共通のユーティリティおよび設定ファイル
│   │   ├── auth.ts              # JWTトークン関連のユーティリティ関数 (生成、検証など)
│   │   ├── db.ts                # (⚠️ 未使用の可能性あり - Prismaがデータベース接続を管理)
│   │   └── prisma.ts            # PrismaClient のインスタンスと設定
│   │
│   ├── locales/                 # 国際化(i18n)のための言語データファイル
│   │   ├── en.json              # 英語ロケールデータ
│   │   └── ja.json              # 日本語ロケールデータ
│   │
│   ├── register/
│   │   └── page.tsx             # ユーザー登録ページ (/register)
│   │
│   ├── styles/
│   │   └── globals.css          # アプリケーション全体に適用されるグローバルCSSスタイル
│   │
│   ├── layout.tsx               # アプリケーション全体のグローバルレイアウト (ルートレイアウト)
│   ├── middleware.ts            # Next.js のミドルウェア (リクエスト処理のフック、認証チェックなど)
│   ├── page.tsx                 # アプリケーションのメインエントリポイント (例: ログインページ)
│   └── providers.tsx            # グローバルなコンテキストプロバイダーをまとめるファイル (Auth, i18n, Themeなど)
│
├── hooks/                       # カスタムReactフック
│   └── useAuth.ts               # 認証状態を管理するためのカスタムフック
│
├── prisma/                      # Prisma ORM 関連ファイル
│   └── schema.prisma            # データベーススキーマ定義
│
├── public/                      # 静的ファイルを提供するためのディレクトリ (画像、フォントなど)
│   └── (画像ファイルなど)
│
├── .env                         # 環境変数を定義するファイル (.env.local など)
├── next.config.js               # Next.js の設定ファイル
├── package.json                 # プロジェクトの依存関係とスクリプト
├── tsconfig.json                # TypeScript コンパイラ設定ファイル
└── (その他設定ファイル: .gitignore, README.md など)
🚀 Key Features (主な機能)
このアプリケーションの主要な機能は以下の通りです。

Feature (機能)

Description (説明)

ユーザー登録

/register ページで新しいアカウントを作成できます。

ログイン/ログアウト

JWTトークンベースの認証システム（localStorageを使用）により安全なログインとログアウトが可能です。

投稿作成

認証されたユーザーのみが新しいブログ投稿を作成できます。

投稿編集/削除

ユーザーは自分が作成した投稿のみを編集・削除できます。

コメント機能

各投稿に対してコメントを投稿・閲覧できます。自分が投稿したコメントは削除できます。

JWT認証ミドルウェア

ログイン状態をチェックし、保護されたルートへのアクセスを制御します。

RESTful API構造

全てのサーバーリクエストは /api ルート経由で処理され、クリーンなAPI設計です。

国際化 (i18n)

ロケールファイル(en.json, ja.json)を介して複数言語（英語、日本語）をサポートします。

ダークモード

ユーザー設定またはシステム設定に基づき、ライトモードとダークモードを切り替え可能です。

画像アップロード

Cloudinaryサービスを利用して画像をアップロードし、投稿に含めることができます。

いいね機能

各投稿に対していいねをしたり、いいねを取り消したりできます。

投稿検索 (多言語対応)

投稿のタイトルや内容を検索できます。英語と日本語の両方に対応しています。


Google スプレッドシートにエクスポート
🛠️ Tech Stack Used (使用技術スタック)
このプロジェクトで使用されている主な技術は以下の通りです。

Area (分野)

Technology (技術)

フレームワーク

Next.js App Router (v13+)

フロントエンド

React, TypeScript, Tailwind CSS

状態管理

なし (useState, useEffect を主に利用)

バックエンド

Next.js API Routes (App Router ベース)

データベース

PostgreSQL

ORM/クエリ

Prisma ORM (Raw SQL queries for advanced search)

認証

JWT (jsonwebtoken), bcrypt (パスワードハッシュ化), ミドルウェア認証

国際化

Next.js i18n ルーティング、JSONロケールファイル

画像ストレージ

Cloudinary

日時フォーマット

date-fns


Google スプレッドシートにエクスポート
# Getting Started (始め方)
プロジェクトをローカル環境でセットアップし、実行するための詳細な手順です。

1. 前提条件 (Prerequisites)
このプロジェクトを実行するには、以下のソフトウェアがインストールされている必要があります。

Node.js: v18.x 以上を推奨します。

npm または Yarn: パッケージマネージャー。

PostgreSQL: ローカルデータベースとしてPostgreSQLが必要です。

2. リポジトリのクローン (Clone the Repository)
まず、プロジェクトのソースコードをローカルマシンにクローンします。

Bash

git clone [あなたのリポジトリのURL]
cd my-next-project
3. 依存関係のインストール (Install Dependencies)
プロジェクトのルートディレクトリで、以下のコマンドを実行して必要なパッケージをインストールします。

Bash

npm install
# または yarn install
4. 環境変数の設定 (.env.local)
プロジェクトのルートディレクトリに、.env.local という名前のファイルを作成し、以下の環境変数を設定します。これらの変数はデータベース接続、JWTシークレット、画像アップロードに必要です。

コード スニペット

# データベース接続文字列 (PostgreSQL)
# 例: postgresql://ユーザー名:パスワード@ホスト名:ポート/データベース名
DATABASE_URL="postgresql://user:password@localhost:5432/your_database_name"

# JWTシークレットキー (任意の強力な文字列を設定してください)
# トークン署名に使用されます。本番環境ではランダムな文字列を生成してください。
JWT_SECRET="your_strong_jwt_secret_key"

# Cloudinary API設定 (画像アップロード用)
# Cloudinaryアカウントで取得できる情報です。
CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
CLOUDINARY_API_KEY="your_cloudinary_api_key"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret"
重要:

DATABASE_URL: ご自身のPostgreSQL設定に合わせてuser, password, localhost:5432, your_database_name を変更してください。

JWT_SECRET: 推測されにくい、十分に長いランダムな文字列を設定してください。

CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET: Cloudinary でアカウントを作成し、Dashboardから取得した情報を入力してください。

5. PostgreSQLデータベースのセットアップ (PostgreSQL Database Setup)
このアプリケーションはPostgreSQLデータベースとPrisma ORMを使用します。

以下の手順でデータベースを準備してください。

PostgreSQLサーバーの起動: ローカルでPostgreSQLサーバーが実行されていることを確認します。

Dockerを使用している場合: docker start [あなたのPostgreSQLコンテナ名]

Homebrew (macOS) を使用している場合: brew services start postgresql

Windowsの場合: PostgreSQLインストーラーが提供するサービスマネージャーから起動します。

データベースの作成: DATABASE_URLで指定したデータベース名（例: your_database_name）のデータベースをPostgreSQL内で作成します。

psqlコマンドラインツールを使用する場合:

Bash

psql -U your_username -h localhost -p 5432 -d postgres
CREATE DATABASE your_database_name;
\q
pgAdminなどのGUIツールを使用しても構いません。

6. データベーススキーマの同期 (Database Schema Synchronization)
Prisma ORM を使用して、定義されたスキーマをデータベースに同期させます。

Bash

npx prisma generate  # Prisma Client コードの生成
npx prisma db push   # Prisma スキーマをデータベースに同期 (テーブル作成など)
注: npx prisma db push --force-reset は、開発中にデータベースを完全にリセットし、スキーマを再適用する場合にのみ使用します。

7. 開発サーバーの実行 (Run the Development Server)
すべての設定が完了したら、以下のコマンドを実行して開発サーバーを起動します。

Bash

npm run dev
# または yarn dev
サーバーが起動すると、通常 http://localhost:3000 でアプリケーションにアクセスできるようになります。

How to Use the Application (アプリケーションの使用方法)
アプリケーションが起動したら、以下の手順でブログ機能を利用できます。

アクセス: ブラウザで http://localhost:3000 にアクセスします。メインページが表示されます。

ユーザー登録 (初めての場合):

ページ上の「新規登録はこちら」または /register に直接アクセスし、ユーザー名、メールアドレス、パスワードを入力してアカウントを登録します。

ログイン:

登録したメールアドレスとパスワードを使用してログインします。

ログインに成功すると、ブログ投稿一覧ページ (/blog) にリダイレクトされます。

ブログ投稿一覧の確認:

ログイン後、既存のブログ投稿が一覧で表示されます。

右上の言語切り替えボタンで「JP」または「EN」を選択すると、UI言語が変更されます。

右上のテーマ切り替えボタンでライトモードとダークモードを切り替えることができます。

新しい投稿の作成:

ブログ一覧ページ中央にある「新規投稿」または「Create New Post」ボタンをクリックします。

タイトル、内容、必要であれば画像ファイルをアップロードして投稿を作成します。

投稿の編集・削除:

自分が作成した投稿の場合、各投稿カードの右側に「編集」と「削除」ボタンが表示されます。

「編集」をクリックすると投稿編集ページに移動し、内容を更新できます。

「削除」をクリックすると確認ダイアログが表示され、確認後投稿が削除されます。

コメント機能:

投稿詳細ページでコメントを閲覧し、新しいコメントを投稿できます。

自分が投稿したコメントには「削除」ボタンが表示され、コメントを削除できます。

いいね機能:

各投稿の下部にある「いいね」ボタンをクリックすると、投稿にいいねを追加できます。

もう一度クリックするといいねが取り消されます。いいね数はリアルタイムで更新されます。

投稿検索:

ブログ一覧ページ上部の検索バーにキーワードを入力して投稿を検索できます。日本語での検索も可能です。

ログアウト:

左側のサイドバーにある「ログアウト」ボタンをクリックすると、現在のセッションが終了しログインページに戻ります。

