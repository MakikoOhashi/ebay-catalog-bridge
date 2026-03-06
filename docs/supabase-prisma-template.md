# Supabase移行テンプレート（.env + Prisma）

このリポジトリは現在、`prisma/schema.prisma` を Postgres 固定で運用します。
Render + Supabase 構成は以下を使ってください。

## 参照ファイル

- `.env.example`（Postgres前提の基本テンプレート）
- `.env.supabase.example`（Supabase向け）

## セットアップ手順（例）

1. `.env.supabase.example` を参考に `.env` の `DATABASE_URL` / `DIRECT_URL` を設定
2. Prisma Client生成とスキーマ反映を実行

```bash
npx prisma generate
npx prisma db push
```

## 運用メモ

- アプリ実行は通常 `DATABASE_URL`（pooler URL）を使う
- 直接接続が必要な処理のみ `DIRECT_URL` を使う
- Render起動時は `npm run docker-start`（`prisma db push` を含む）
- 秘密情報は `.env` に置き、Gitへコミットしない
