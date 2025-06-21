📝 My Next.js Blog Project (私のNext.jsブログプロジェクト)
このプロジェクトは、Next.jsとPostgreSQLを使用して構築されたブログWebアプリケーションです。JWT認証、RESTful API、動的ルーティングに基づいたユーザー認証および投稿管理機能を提供します。ユーザーはライト/ダークモードを切り替えることができ、国際化にも対応しています。
📁 Project Folder Structure (プロジェクトのファイル構成)
以下は、このプロジェクトの主要なフォルダとファイルの概要です。

app/
├── api/               # サーバーサイドAPIルート (App Router ベース)
│    ├── auth/route.ts            # ユーザーログイン、パスワードハッシュ化など
│    ├── auth/me/route.ts         # トークン認証 → ユーザーIDを返却
│    ├── posts/route.ts          # 全ての投稿の取得、投稿作成
│    ├── posts/[id]/route.ts     # 特定の投稿の取得/編集/削除
│    ├── likes/route.ts         # いいね機能のAPI (追加)
│    └── upload/route.ts         # 画像アップロード機能 (Cloudinary)
│
├── auth/
│    ├── register/page.tsx       # ユーザー登録ページ
│    └── login/page.tsx         # ユーザーログインページ
│
├── blog/
│    ├── [id]/page.tsx          # ブログ投稿詳細ページ
│    ├── [id]/edit/page.tsx     # ブログ投稿編集ページ
│    ├── new/page.tsx          # 新規ブログ投稿作成ページ
│    └── page.tsx             # ブログ投稿一覧ページ
│
├── components/
│    ├── post-form.tsx          # 再利用可能な投稿フォームコンポーネント
│    ├── LanguageProvider.tsx   # 言語コンテキストプロバイダー (i18n)
│    ├── ThemeProvider.tsx      # テーマコンテキストプロバイダー (ライト/ダークモード)
│    └── ThemeToggleButton.tsx  # テーマ切り替えボタンコンポーネント
│
├── lib/
│    ├── auth.ts              # JWTトークン関連ユーティリティ関数
│    ├── db.ts               # PostgreSQLデータベース接続プール
│    └── prisma.ts            # Prisma ORM設定 (使用されている場合)
│
├── locales/
│    ├── en.json              # 英語ロケールデータ
│    └── ja.json              # 日本語ロケールデータ
│
├── styles/
│    └── globals.css          # グローバルCSSスタイル
│
├── layout.tsx               # アプリケーション全体のグローバルレイアウト
├── middleware.ts            # トークン認証のためのミドルウェア
├── page.tsx                # ログインページ (メインエントリポイントとして機能)
├── next.config.js           # Next.js設定ファイル
└── providers.tsx            # グローバルプロバイダー (認証、i18n、テーマ)

🚀 Key Features (主な機能)
このアプリケーションの主要な機能は以下の通りです。

Feature (機能)	Description (説明)
ユーザー登録	/auth/register ページで新しいアカウントを作成できます。
ログイン/ログアウト	JWTトークンベースの認証システム（localStorageを使用）により安全なログインとログアウトが可能です。
投稿作成	認証されたユーザーのみが新しいブログ投稿を作成できます。
投稿編集/削除	ユーザーは自分が作成した投稿のみを編集・削除できます。
JWT認証ミドルウェア	ログイン状態をチェックし、保護されたルートへのアクセスを制御します。
RESTful API構造	全てのサーバーリクエストは /api ルート経由で処理され、クリーンなAPI設計です。
国際化 (i18n)	ロケールファイル(en.json, ja.json)を介して複数言語（英語、日本語）をサポートします。
ダークモード	ユーザー設定またはシステム設定に基づき、ライトモードとダークモードを切り替え可能です。
画像アップロード	Cloudinaryサービスを利用して画像をアップロードし、投稿に含めることができます。
いいね機能	各投稿に対していいねをしたり、いいねを取り消したりできます。

Google スプレッドシートにエクスポート
🛠️ Tech Stack Used (使用技術スタック)
このプロジェクトで使用されている主な技術は以下の通りです。

Area (分野)	Technology (技術)
フレームワーク	Next.js App Router (v13+)
フロントエンド	React, TypeScript, Tailwind CSS
状態管理	なし (useState, useEffect を主に利用)
バックエンド	Next.js API Routes (App Router ベース)
データベース	PostgreSQL
ORM/クエリ	Direct SQL queries (pg ライブラリの pool.query を使用) / Prisma (該当する場合)
認証	JWT (jsonwebtoken), bcrypt (パスワードハッシュ化), ミドルウェア認証
国際化	Next.js i18n ルーティング、JSONロケールファイル
画像ストレージ	Cloudinary
日時フォーマット	date-fns

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
cd [プロジェクトフォルダ名] # 例: cd my-nextjs-blog-project
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
このアプリケーションはPostgreSQLデータベースを使用します。SQLテーブルはアプリケーションが自動で作成しますので、手動でテーブルを作成する必要はありません。

以下の手順でデータベースを準備してください。

1.PostgreSQLサーバーの起動: ローカルでPostgreSQLサーバーが実行されていることを確認します。
Dockerを使用している場合: docker start [あなたのPostgreSQLコンテナ名]
Homebrew (macOS) を使用している場合: brew services start postgresql
Windowsの場合: PostgreSQLインストーラーが提供するサービスマネージャーから起動します。
2.データベースの作成: DATABASE_URLで指定したデータベース名（例: your_database_name）のデータベースをPostgreSQL内で作成します。
psqlコマンドラインツールを使用する場合:
Bash

psql -U your_username -h localhost -p 5432 -d postgres
CREATE DATABASE your_database_name;
\q
pgAdminなどのGUIツールを使用しても構いません。
6. データベーススキーマの自動生成とマイグレーション (Automatic Database Schema Generation and Migration)
このプロジェクトは、アプリケーション起動時に必要なテーブルを自動的に作成します。
別途Prismaマイグレーションや手動SQL実行は不要です。

7. 開発サーバーの実行 (Run the Development Server)
すべての設定が完了したら、以下のコマンドを実行して開発サーバーを起動します。

Bash

npm run dev
# または yarn dev
サーバーが起動すると、通常 http://localhost:3000 でアプリケーションにアクセスできるようになります。

# How to Use the Application (アプリケーションの使用方法)
アプリケーションが起動したら、以下の手順でブログ機能を利用できます。

1.アクセス: ブラウザで http://localhost:3000 にアクセスします。ログインページが表示されます。
2.ユーザー登録 (初めての場合):
ログインページの下部にある「新規登録はこちら」または「Register」リンクをクリックします。
ユーザー名、メールアドレス、パスワードを入力し、アカウントを登録します。
3.ログイン:
登録したメールアドレスとパスワードを使用してログインします。
ログインに成功すると、ブログ投稿一覧ページ (/blog) にリダイレクトされます。
4.ブログ投稿一覧の確認:
ログイン後、既存のブログ投稿が一覧で表示されます。
右上の言語切り替えボタンで「JP」または「EN」を選択すると、UI言語が変更されます。
右上のテーマ切り替えボタンでライトモードとダークモードを切り替えることができます。
5.新しい投稿の作成:
ブログ一覧ページ中央にある「新規投稿」または「Create New Post」ボタンをクリックします。
タイトル、内容、必要であれば画像ファイルをアップロードして投稿を作成します。
6.投稿の編集・削除:
自分が作成した投稿の場合、各投稿カードの右側に「編集」と「削除」ボタンが表示されます。
「編集」をクリックすると投稿編集ページに移動し、内容を更新できます。
「削除」をクリックすると確認ダイアログが表示され、確認後投稿が削除されます。
7.いいね機能:
各投稿の下部にある「いいね」ボタンをクリックすると、投稿にいいねを追加できます。
もう一度クリックするといいねが取り消されます。いいね数はリアルタイムで更新されます。
8.ログアウト:
左側のサイドバーにある「ログアウト」ボタンをクリックすると、現在のセッションが終了しログインページに戻ります。

