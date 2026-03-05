-- Rename app tables to ebay_* prefix while preserving data
ALTER TABLE "stores" RENAME TO "ebay_stores";
ALTER TABLE "sku_links" RENAME TO "ebay_sku_links";
ALTER TABLE "sku_conflicts" RENAME TO "ebay_sku_conflicts";
ALTER TABLE "sync_checkpoint" RENAME TO "ebay_sync_checkpoint";
ALTER TABLE "sync_runs" RENAME TO "ebay_sync_runs";
ALTER TABLE "sync_errors" RENAME TO "ebay_sync_errors";
