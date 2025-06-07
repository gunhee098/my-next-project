import { PrismaClient } from "@prisma/client"; // PrismaClientをインポート

// グローバルオブジェクトにPrismaClientインスタンスを格納するための定義
// ホットリロード時に新しいPrismaClientインスタンスが作成されるのを防ぎます。
// これにより、開発環境でのデータベース接続警告を避けることができます。
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// PrismaClientインスタンスをエクスポート
// グローバルに既存のPrismaClientインスタンスがあればそれを再利用し、
// なければ新しいインスタンスを作成します。
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// 開発環境 (productionではない場合) でのみ、
// 作成されたPrismaClientインスタンスをグローバルオブジェクトに保存します。
// これもホットリロード時の重複インスタンス作成防止のためです。
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;