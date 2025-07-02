## 📁 Project Folder Structure (プロジェクトのファイル構成)

以下は、このプロジェクトの主要なフォルダとファイルの概要です。

app/
├── api/                   # サーバーサイドAPIルート (App Router ベース)
│   ├── auth/route.ts            # ユーザーログイン、パスワードハッシュ化など
│   ├── auth/me/route.ts         # トークン認証 → ユーザーIDを返却
│   ├── posts/route.ts           # 全ての投稿の取得、投稿作成、投稿検索
│   ├── posts/[id]/route.ts      # 特定の投稿の取得/編集/削除
│   ├── likes/route.ts           # いいね機能のAPI (追加)
│   ├── upload/route.ts          # 画像アップロード機能 (Cloudinary)
│   └── user/route.ts            # ユーザー関連API (例: プロフィール取得など)
│
├── auth/                       # 認証関連ページ (login/register 등, page.tsx가 메인 로그인페이지 역할)
│   └── register/page.tsx        # ユーザー登録ページ (최상위 auth 폴더 아래에 있으면)
│                                # 만약 최상위 app/register/page.tsx 라면 이 부분은 수정 필요
│                                # 현재 스샷으로는 app/register/page.tsx 처럼 보입니다.
│
├── blog/
│   ├── [id]/
│   │   ├── edit/page.tsx
│   │   └── page.tsx             # ブログ投稿詳細ページ
│   └── page.tsx                 # ブログ投稿一覧ページ
│
├── components/
│   ├── post-form.tsx            # 再利用可能な投稿フォームコンポーネント
│   ├── LanguageProvider.tsx     # 言語コンテキストプロバイダー (i18n)
│   ├── ThemeProvider.tsx        # テーマコンテキストプロバイダー (ライト/ダークモード)
│   └── ThemeToggleButton.tsx    # テーマ切り替えボタンコンポーネント
│
├── lib/
│   ├── auth.ts                  # JWTトークン関連ユーティリティ関数
│   ├── db.ts                    # PostgreSQLデータベース接続ユーティリティ (⚠️ 現在はPrismaを使用)
│   └── prisma.ts                # PrismaClient インスタンス
│
├── locales/
│   ├── en.json                  # 英語ロケールデータ
│   └── ja.json                  # 日本語ロケールデータ
│
├── styles/
│   └── globals.css              # グローバルCSSスタイル
│
├── layout.tsx                   # アプリケーション全体のグローバルレイアウト
├── middleware.ts                # トークン認証のためのミドルウェア
├── page.tsx                     # ログインページ (メインエントリポイントとして機能)
├── providers.tsx                # グローバルプロバイダー (認証、i18n、テーマ)

---

## 🚀 Key Features (主な機能)

このアプリケーションの主要な機能は以下の通りです。

| Feature (機能)           | Description (説明)                                                              |
| :----------------------- | :-------------------------------------------------------------------------------- |
| ユーザー登録             | `/auth/register` ページで新しいアカウントを作成できます。                       |
| ログイン/ログアウト      | **JWTトークンベースの認証システム**（localStorageを使用）により安全なログインとログアウトが可能です。 |
| 投稿作成                 | 認証されたユーザーのみが新しいブログ投稿を作成できます。                        |
| 投稿編集/削除            | ユーザーは自分が作成した投稿のみを編集・削除できます。                          |
| JWT認証ミドルウェア      | ログイン状態をチェックし、保護されたルートへのアクセスを制御します。            |
| RESTful API構造          | 全てのサーバーリクエストは `/api` ルート経由で処理され、クリーンなAPI設計です。 |
| 国際化 (i18n)            | ロケールファイル(en.json, ja.json)を介して複数言語（英語、日本語）をサポートします。 |
| ダークモード             | ユーザー設定またはシステム設定に基づき、ライトモードとダークモードを切り替え可能です。 |
| 画像アップロード         | Cloudinaryサービスを利用して画像をアップロードし、投稿に含めることができます。    |
| **いいね機能** | 各投稿に対していいねをしたり、いいねを取り消したりできます。                      |
| **投稿検索 (多言語対応)** | 投稿のタイトルや内容を検索できます。**英語と日本語の両方に対応**しています。 |

---

## 🛠️ Tech Stack Used (使用技術スタック)

このプロジェクトで使用されている主な技術は以下の通りです。

| Area (分野)    | Technology (技術)                                   |
| :------------- | :-------------------------------------------------- |
| フレームワーク | Next.js App Router (v13+)                         |
| フロントエンド | React, TypeScript, Tailwind CSS                     |
| 状態管理       | なし (useState, useEffect を主に利用)             |
| バックエンド   | Next.js API Routes (App Router ベース)            |
| データベース   | PostgreSQL                                          |
| ORM/クエリ     | **Prisma ORM** (Raw SQL queries for advanced search) |
| 認証           | JWT (jsonwebtoken), bcrypt (パスワードハッシュ化), ミドルウェア認証 |
| 国際化         | Next.js i18n ルーティング、JSONロケールファイル     |
| 画像ストレージ | Cloudinary                                          |
| 日時フォーマット | date-fns                                            |

---

## # Getting Started (始め方)

プロジェクトをローカル環境でセットアップし、実行するための詳細な手順です。

### 1. 前提条件 (Prerequisites)

このプロジェクトを実行するには、以下のソフトウェアがインストールされている必要があります。

* **Node.js**: v18.x 以上を推奨します。
* **npm** または **Yarn**: パッケージマネージャー。
* **PostgreSQL**: ローカルデータベースとしてPostgreSQLが必要です。

### 2. リポジトリのクローン (Clone the Repository)

まず、プロジェクトのソースコードをローカルマシンにクローンします。

```bash
git clone [あなたのリポジトリのURL]
cd [プロジェクトフォルダ名] # 例: cd my-nextjs-blog-project
3. 依存関係のインストール (Install Dependencies)
プロジェクトのルートディレクトリで、以下のコマンドを実行して必要なパッケージをインストールします。

Bash

npm install
# または yarn install
4. 環境変数の設定 (.env.local)
プロジェクトのルートディレクトリに、.env.local という名前のファイルを作成し、以下の環境変数を設定します。これらの変数はデータベース接続、JWTシークレット、画像アップロードに必要です。

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

# How to Use the Application (アプリケーションの使用方法)
アプリケーションが起動したら、以下の手順でブログ機能を利用できます。

アクセス: ブラウザで http://localhost:3000 にアクセスします。ログインページが表示されます。

ユーザー登録 (初めての場合):

ログインページの下部にある「新規登録はこちら」または「Register」リンクをクリックします。

ユーザー名、メールアドレス、パスワードを入力し、アカウントを登録します。

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

いいね機能:

各投稿の下部にある「いいね」ボタンをクリックすると、投稿にいいねを追加できます。

もう一度クリックするといいねが取り消されます。いいね数はリアルタイムで更新されます。

投稿検索:

ブログ一覧ページ上部の検索バーにキーワードを入力して投稿を検索できます。日本語での検索も可能です。

ログアウト:

左側のサイドバーにある「ログアウト」ボタンをクリックすると、現在のセッションが終了しログインページに戻ります。