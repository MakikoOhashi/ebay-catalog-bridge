-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ebay_stores" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sync_frequency_minutes" INTEGER NOT NULL DEFAULT 30,
    "sync_fields" TEXT NOT NULL DEFAULT 'title,description,images,weight,stock,price',
    "price_sync_enabled" BOOLEAN NOT NULL DEFAULT false,
    "fixed_fx_rate" REAL NOT NULL DEFAULT 150,
    "round_rule" TEXT NOT NULL DEFAULT 'nearest',
    "error_notify_email" TEXT
);
INSERT INTO "new_ebay_stores" ("created_at", "id", "shop") SELECT "created_at", "id", "shop" FROM "ebay_stores";
DROP TABLE "ebay_stores";
ALTER TABLE "new_ebay_stores" RENAME TO "ebay_stores";
CREATE UNIQUE INDEX "ebay_stores_shop_key" ON "ebay_stores"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- RedefineIndex
DROP INDEX "sku_conflicts_store_id_sku_key";
CREATE UNIQUE INDEX "ebay_sku_conflicts_store_id_sku_key" ON "ebay_sku_conflicts"("store_id", "sku");

-- RedefineIndex
DROP INDEX "sku_conflicts_store_id_status_idx";
CREATE INDEX "ebay_sku_conflicts_store_id_status_idx" ON "ebay_sku_conflicts"("store_id", "status");

-- RedefineIndex
DROP INDEX "sku_links_store_id_sku_key";
CREATE UNIQUE INDEX "ebay_sku_links_store_id_sku_key" ON "ebay_sku_links"("store_id", "sku");

-- RedefineIndex
DROP INDEX "sku_links_ebay_account_id_idx";
CREATE INDEX "ebay_sku_links_ebay_account_id_idx" ON "ebay_sku_links"("ebay_account_id");

-- RedefineIndex
DROP INDEX "sku_links_store_id_sync_status_idx";
CREATE INDEX "ebay_sku_links_store_id_sync_status_idx" ON "ebay_sku_links"("store_id", "sync_status");

-- RedefineIndex
DROP INDEX "sync_errors_store_id_created_at_idx";
CREATE INDEX "ebay_sync_errors_store_id_created_at_idx" ON "ebay_sync_errors"("store_id", "created_at" DESC);

-- RedefineIndex
DROP INDEX "sync_errors_run_id_idx";
CREATE INDEX "ebay_sync_errors_run_id_idx" ON "ebay_sync_errors"("run_id");

-- RedefineIndex
DROP INDEX "sync_runs_store_id_started_at_idx";
CREATE INDEX "ebay_sync_runs_store_id_started_at_idx" ON "ebay_sync_runs"("store_id", "started_at" DESC);
