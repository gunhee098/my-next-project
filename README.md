# My Blog App

Next.js App Routerを使用して構築された現代的なブログアプリケーションです。JWT認証、コメント、いいね機能、ダークモード、多言語サポートなどの機能を提供します。

## 🚀 主な機能

- **ユーザー認証**: JWT基盤の会員登録・ログイン
- **ブログ投稿**: 記事の作成、編集、削除
- **コメントシステム**: 記事別コメント作成・削除
- **いいね機能**: 記事への「いいね」・取り消し
- **画像アップロード**: Cloudinary連携
- **検索機能**: タイトル・内容検索
- **ダークモード**: ライト・ダークテーマ対応
- **多言語対応**: 英語・日本語サポート
- **レスポンシブデザイン**: モバイルフレンドリーUI

## 🛠 技術スタック

- **フロントエンド**: React 18, Next.js 13+ (App Router), TypeScript
- **スタイリング**: Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: PostgreSQL + Prisma ORM
- **認証**: JWT + bcrypt
- **画像ストレージ**: Cloudinary
- **ユーティリティ**: date-fns

## 📁 プロジェクト構造

```
my-next-project/
├── app/
│   ├── api/                 # APIルート
│   │   ├── auth/           # 認証API
│   │   ├── comments/       # コメントAPI
│   │   ├── likes/          # いいねAPI
│   │   ├── posts/          # 記事API
│   │   ├── upload/         # 画像アップロードAPI
│   │   └── user/           # ユーザーAPI
│   ├── blog/               # ブログページ群
│   │   ├── [id]/           # 個別記事ページ
│   │   ├── new/            # 新規記事作成
│   │   └── page.tsx        # 記事一覧
│   ├── components/         # 再利用可能コンポーネント
│   │   ├── LanguageProvider.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── ThemeToggleButton.tsx
│   │   ├── ShareButton.tsx
│   │   └── post-form.tsx
│   ├── lib/                # ライブラリ・設定
│   │   ├── auth.ts
│   │   └── prisma.ts
│   ├── locales/           # 多言語ファイル
│   │   ├── en.json
│   │   └── ja.json
│   ├── register/          # ユーザー登録
│   ├── styles/           # スタイル
│   │   └── globals.css
│   ├── layout.tsx        # グローバルレイアウト
│   ├── page.tsx          # メインページ（ログイン）
│   ├── providers.tsx     # Context Providers
│   └── middleware.ts     # Next.js ミドルウェア
├── hooks/                # カスタムフック
│   └── useAuth.tsx
├── prisma/              # データベーススキーマ
├── public/              # 静的ファイル
│   └── *.svg           # アイコンファイル群
├── .env                 # 環境変数
├── README.md           # このファイル
└── 設定ファイル群...
```

## 🏃‍♂️ 開始方法

### 1. クローン・インストール

```bash
git clone <repository-url>
cd my-next-project
npm install
```

### 2. 環境変数設定

`.env.local`ファイルを作成し、以下の内容を追加してください：

```env
# データベース
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# JWT
JWT_SECRET="your_jwt_secret_key"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

### 3. データベース設定

```bash
# Prismaスキーマ生成
npx prisma generate

# データベースマイグレーション
npx prisma db push
```

### 4. 開発サーバー実行

```bash
npm run dev
```

ブラウザで`http://localhost:3000`にアクセスしてください。

## 📱 使用方法

1. **ユーザー登録**: `/register`でアカウント作成
2. **ログイン**: メールアドレスとパスワードでログイン
3. **投稿作成**: ログイン後、新しい記事を作成
4. **インタラクション**: コメント投稿、いいね、検索などを利用
5. **設定変更**: 右上からテーマ・言語を変更

## 🔧 開発用スクリプト

```bash
npm run dev          # 開発サーバー実行
npm run build        # 本番用ビルド
npm run start        # 本番サーバー実行
npm run lint         # ESLint実行
```

## 📦 主要依存関係

```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "prisma": "^5.0.0",
  "tailwindcss": "^3.0.0",
  "jsonwebtoken": "^9.0.0",
  "bcrypt": "^5.0.0",
  "cloudinary": "^1.0.0"
}
```

## 🚀 デプロイメント

### Vercelでのデプロイ

1. GitHubにコードをプッシュ
2. [Vercel](https://vercel.com)でインポート
3. 環境変数を設定
4. デプロイ完了

### データベース

- **開発環境**: ローカルPostgreSQL
- **本番環境**: Railway、PlanetScale、Supabaseなどを推奨

## 🤝 コントリビューション

1. プロジェクトをフォーク
2. Featureブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で配布されています。

---

⭐ このプロジェクトが役に立ちましたら、スターをお願いします！