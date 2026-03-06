# ebay-catalog-bridge v1 実装ブループリント

このドキュメントは [spec.md](./spec.md) を実装に直接落とすための土台です。

## 1. DB DDL (PostgreSQL)

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('connected', 'revoked', 'error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sync_status AS ENUM ('ok', 'skipped', 'conflict', 'missing_on_ebay', 'error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE conflict_status AS ENUM ('open', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE checkpoint_mode AS ENUM ('rolling', 'full');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE run_status AS ENUM ('running', 'succeeded', 'failed', 'partial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- stores
CREATE TABLE IF NOT EXISTS stores (
  id              BIGSERIAL PRIMARY KEY,
  shop            TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ebay_accounts
CREATE TABLE IF NOT EXISTS ebay_accounts (
  id                      BIGSERIAL PRIMARY KEY,
  store_id                BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  label                   TEXT NOT NULL,
  ebay_user_id            TEXT,
  refresh_token_enc       BYTEA NOT NULL, -- encrypted token blob
  scopes                  TEXT[] NOT NULL DEFAULT '{}',
  status                  account_status NOT NULL DEFAULT 'connected',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, label)
);

CREATE INDEX IF NOT EXISTS idx_ebay_accounts_store_id ON ebay_accounts(store_id);

-- sku_links
CREATE TABLE IF NOT EXISTS sku_links (
  id                      BIGSERIAL PRIMARY KEY,
  store_id                BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sku                     TEXT NOT NULL,
  ebay_account_id         BIGINT NOT NULL REFERENCES ebay_accounts(id) ON DELETE CASCADE,
  ebay_item_id            TEXT,
  ebay_variation_key      TEXT,
  ebay_last_modified      TIMESTAMPTZ,
  shopify_product_id      TEXT,
  shopify_variant_id      TEXT,
  sync_status             sync_status NOT NULL DEFAULT 'ok',
  last_sync_at            TIMESTAMPTZ,
  last_seen_in_run_id     BIGINT,
  last_error              TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_sku_links_store_status ON sku_links(store_id, sync_status);
CREATE INDEX IF NOT EXISTS idx_sku_links_ebay_account_id ON sku_links(ebay_account_id);

-- sku_conflicts
CREATE TABLE IF NOT EXISTS sku_conflicts (
  id                      BIGSERIAL PRIMARY KEY,
  store_id                BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sku                     TEXT NOT NULL,
  found_in_accounts       JSONB NOT NULL,
  first_detected_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_detected_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status                  conflict_status NOT NULL DEFAULT 'open',
  note                    TEXT,
  UNIQUE (store_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_sku_conflicts_store_status ON sku_conflicts(store_id, status);

-- sync_checkpoint
CREATE TABLE IF NOT EXISTS sync_checkpoint (
  ebay_account_id         BIGINT PRIMARY KEY REFERENCES ebay_accounts(id) ON DELETE CASCADE,
  cursor                  TEXT,
  mode                    checkpoint_mode NOT NULL DEFAULT 'rolling',
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error              TEXT
);

-- sync_runs
CREATE TABLE IF NOT EXISTS sync_runs (
  id                      BIGSERIAL PRIMARY KEY,
  store_id                BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  ebay_account_id         BIGINT REFERENCES ebay_accounts(id) ON DELETE SET NULL,
  mode                    checkpoint_mode NOT NULL,
  started_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at                TIMESTAMPTZ,
  status                  run_status NOT NULL DEFAULT 'running',
  total_items             INTEGER NOT NULL DEFAULT 0,
  processed_items         INTEGER NOT NULL DEFAULT 0,
  created_count           INTEGER NOT NULL DEFAULT 0,
  updated_count           INTEGER NOT NULL DEFAULT 0,
  skipped_count           INTEGER NOT NULL DEFAULT 0,
  conflict_count          INTEGER NOT NULL DEFAULT 0,
  missing_count           INTEGER NOT NULL DEFAULT 0,
  error_count             INTEGER NOT NULL DEFAULT 0,
  message                 TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_store_started ON sync_runs(store_id, started_at DESC);

-- sync_errors
CREATE TABLE IF NOT EXISTS sync_errors (
  id                      BIGSERIAL PRIMARY KEY,
  run_id                  BIGINT NOT NULL REFERENCES sync_runs(id) ON DELETE CASCADE,
  store_id                BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  ebay_account_id         BIGINT REFERENCES ebay_accounts(id) ON DELETE SET NULL,
  sku                     TEXT,
  ebay_item_id            TEXT,
  error_code              TEXT,
  error_message           TEXT NOT NULL,
  payload                 JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_errors_run_id ON sync_errors(run_id);
CREATE INDEX IF NOT EXISTS idx_sync_errors_store_created ON sync_errors(store_id, created_at DESC);
```

## 2. APIルート一覧（v1）

React Router resource route想定（`app/routes/*.ts`）。

| Method | Path | 用途 | 認証 | 成功レスポンス |
|---|---|---|---|---|
| GET | `/health` | Liveness確認 | 不要（外形監視用） | `200 {"ok":true}` |
| POST | `/jobs/enqueue-sync` | 同期ジョブをenqueueのみ | 固定トークン or HMAC | `200 {"accepted":true,"jobId":"..."}` |
| GET | `/api/settings` | 設定画面の現在値取得 | Shopify admin session | `200` 設定JSON |
| PUT | `/api/settings` | 同期設定更新（頻度/対象項目/価格設定） | Shopify admin session | `200 {"updated":true}` |
| GET | `/api/accounts` | eBay接続済みアカウント一覧 | Shopify admin session | `200` 配列 |
| POST | `/api/accounts/connect/start` | eBay OAuth開始URL発行 | Shopify admin session | `200 {"authorizeUrl":"..."}` |
| GET | `/api/accounts/connect/callback` | eBay OAuth callback受信 | state + Shopify session | 成功時リダイレクト |
| POST | `/api/accounts/:id/disconnect` | アカウント無効化 | Shopify admin session | `200 {"disconnected":true}` |
| GET | `/api/sync/status` | 実行状況（最新run/checkpoint） | Shopify admin session | `200` 状況JSON |
| GET | `/api/sync/errors` | 直近エラー一覧 | Shopify admin session | `200` 配列 |
| GET | `/api/conflicts` | SKU衝突一覧 | Shopify admin session | `200` 配列 |
| POST | `/api/conflicts/:id/resolve` | conflictをresolved化 | Shopify admin session | `200 {"resolved":true}` |

最小実装優先順位:
1. `/health`
2. `/jobs/enqueue-sync`
3. `/api/sync/status`
4. `/api/conflicts`

## 3. 同期ジョブ擬似コード

```text
function runSyncForAccount(storeId, ebayAccountId, mode = "rolling"):
  run = createSyncRun(storeId, ebayAccountId, mode, status="running")

  checkpoint = getOrCreateCheckpoint(ebayAccountId)
  cursor = checkpoint.cursor

  while true:
    page = ebay.fetchListings(account=ebayAccountId, cursor=cursor, limit=CHUNK_SIZE)

    if page.error in [429, 500..599]:
      retryWithExponentialBackoff(page.request)
      continue

    for item in page.items:
      run.total_items += 1

      sku = extractSku(item)
      if sku is null or sku == "":
        recordItemError(run, item, "SKU_MISSING")
        run.error_count += 1
        continue

      conflict = detectSkuConflict(storeId, sku, ebayAccountId)
      if conflict.exists:
        upsertConflict(storeId, sku, conflict.accounts)
        markSkuLinkConflict(storeId, sku)
        run.conflict_count += 1
        continue

      existing = findSkuLink(storeId, sku)
      shouldUpdate = isChanged(existing.ebay_last_modified, item.last_modified)

      if not shouldUpdate:
        markSkuSeenInRun(storeId, sku, run.id)
        run.skipped_count += 1
        continue

      mapped = mapEbayItemToShopifyPayload(item, settings)
      -- settings.priceSync=true の場合、固定FXで通貨変換必須
      if settings.priceSync:
        mapped.price = convertUsdToJpy(item.priceUsd, settings.fixedFxRate, settings.roundRule)

      result = shopify.upsertProductBySku(mapped)
      if result.error:
        recordItemError(run, item, result.errorCode)
        markSkuLinkError(storeId, sku, result.errorMessage)
        run.error_count += 1
        continue

      upsertSkuLink(
        storeId, sku, ebayAccountId,
        ebay_item_id=item.itemId,
        ebay_last_modified=item.last_modified,
        shopify_product_id=result.productId,
        shopify_variant_id=result.variantId,
        sync_status="ok",
        last_sync_at=now,
        last_seen_in_run_id=run.id
      )

      upsertShopifyMetafields(result.productId, {
        "ebay.account_id": ebayAccountId,
        "ebay.item_id": item.itemId,
        "ebay.last_modified": item.last_modified,
        "ebay.sync_status": "ok",
        "ebay.source_url": item.viewUrl
      })

      run.processed_items += 1
      if existing is null: run.created_count += 1 else run.updated_count += 1

    if page.nextCursor is null:
      break

    cursor = page.nextCursor
    saveCheckpoint(ebayAccountId, cursor, mode)

  -- 一周後 missing 判定
  missingSkus = findSkusNotSeenInRun(storeId, run.id)
  for sku in missingSkus:
    setShopifyInventoryZeroBySku(storeId, sku)
    markSkuMissingOnEbay(storeId, sku)
    run.missing_count += 1

  finalizeRun(run, status = decideRunStatus(run), ended_at=now)
  saveCheckpoint(ebayAccountId, cursor=null, mode="rolling")
```

## 4. 実装メモ（最初のスプリント）

1. Prisma schemaを上記DDLに対応させる（Render/SupabaseのPostgresを単一運用）
2. `/health` と `/jobs/enqueue-sync` を先に作る
3. workerなしでも `enqueue-sync -> 即時実行` の暫定実装でE2Eを通す
4. SKU衝突とmissing確定ロジックを先に固定し、価格同期は後追い
