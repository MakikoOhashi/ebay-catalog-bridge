-- CreateTable
CREATE TABLE "stores" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ebay_accounts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "ebay_user_id" TEXT,
    "refresh_token_enc" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ebay_accounts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sku_links" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "ebay_account_id" INTEGER NOT NULL,
    "ebay_item_id" TEXT,
    "ebay_variation_key" TEXT,
    "ebay_last_modified" DATETIME,
    "shopify_product_id" TEXT,
    "shopify_variant_id" TEXT,
    "sync_status" TEXT NOT NULL DEFAULT 'ok',
    "last_sync_at" DATETIME,
    "last_seen_in_run_id" INTEGER,
    "last_error" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "sku_links_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sku_links_ebay_account_id_fkey" FOREIGN KEY ("ebay_account_id") REFERENCES "ebay_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sku_conflicts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "found_in_accounts" TEXT NOT NULL,
    "first_detected_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_detected_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'open',
    "note" TEXT,
    CONSTRAINT "sku_conflicts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sync_checkpoint" (
    "ebay_account_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cursor" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'rolling',
    "updated_at" DATETIME NOT NULL,
    "last_error" TEXT,
    CONSTRAINT "sync_checkpoint_ebay_account_id_fkey" FOREIGN KEY ("ebay_account_id") REFERENCES "ebay_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" INTEGER NOT NULL,
    "ebay_account_id" INTEGER,
    "mode" TEXT NOT NULL,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'running',
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "processed_items" INTEGER NOT NULL DEFAULT 0,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "conflict_count" INTEGER NOT NULL DEFAULT 0,
    "missing_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    CONSTRAINT "sync_runs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sync_runs_ebay_account_id_fkey" FOREIGN KEY ("ebay_account_id") REFERENCES "ebay_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sync_errors" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "run_id" INTEGER NOT NULL,
    "store_id" INTEGER NOT NULL,
    "ebay_account_id" INTEGER,
    "sku" TEXT,
    "ebay_item_id" TEXT,
    "error_code" TEXT,
    "error_message" TEXT NOT NULL,
    "payload" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sync_errors_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "sync_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sync_errors_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sync_errors_ebay_account_id_fkey" FOREIGN KEY ("ebay_account_id") REFERENCES "ebay_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_shop_key" ON "stores"("shop");

-- CreateIndex
CREATE INDEX "ebay_accounts_store_id_idx" ON "ebay_accounts"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "ebay_accounts_store_id_label_key" ON "ebay_accounts"("store_id", "label");

-- CreateIndex
CREATE INDEX "sku_links_store_id_sync_status_idx" ON "sku_links"("store_id", "sync_status");

-- CreateIndex
CREATE INDEX "sku_links_ebay_account_id_idx" ON "sku_links"("ebay_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sku_links_store_id_sku_key" ON "sku_links"("store_id", "sku");

-- CreateIndex
CREATE INDEX "sku_conflicts_store_id_status_idx" ON "sku_conflicts"("store_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sku_conflicts_store_id_sku_key" ON "sku_conflicts"("store_id", "sku");

-- CreateIndex
CREATE INDEX "sync_runs_store_id_started_at_idx" ON "sync_runs"("store_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "sync_errors_run_id_idx" ON "sync_errors"("run_id");

-- CreateIndex
CREATE INDEX "sync_errors_store_id_created_at_idx" ON "sync_errors"("store_id", "created_at" DESC);
