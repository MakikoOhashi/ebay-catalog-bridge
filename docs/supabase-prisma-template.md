# Supabase移行テンプレート（.env + Prisma）

このリポジトリは現在、`prisma/schema.prisma`（SQLite）で動作しています。
Supabaseへ切り替えるときは以下を使ってください。

## 追加済みファイル

- `.env.example`（現在のローカル開発向け）
- `.env.supabase.example`（Supabase向け）
- `prisma/schema.postgres.prisma`（Postgres向けPrisma schema）

## 切替手順（例）

1. `.env.supabase.example` を参考に `.env` の `DATABASE_URL` / `DIRECT_URL` を設定
2. Prismaコマンドで Postgres schema を指定

```bash
npx prisma generate --schema prisma/schema.postgres.prisma
npx prisma migrate deploy --schema prisma/schema.postgres.prisma
```

開発中にローカルSQLiteへ戻す場合:

```bash
npx prisma generate --schema prisma/schema.prisma
```

## 運用メモ

- アプリ実行は通常 `DATABASE_URL`（pooler URL）を使う
- 直接接続が必要な処理のみ `DIRECT_URL` を使う
- 秘密情報は `.env` に置き、Gitへコミットしない
