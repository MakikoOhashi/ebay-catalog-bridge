-- This migration runs before the table-prefix migration.
-- Keep table names in pre-prefix form ("stores", "sku_links", ...) here.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_stores" (
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

INSERT INTO "new_stores" ("created_at", "id", "shop")
SELECT "created_at", "id", "shop" FROM "stores";

DROP TABLE "stores";
ALTER TABLE "new_stores" RENAME TO "stores";
CREATE UNIQUE INDEX "stores_shop_key" ON "stores"("shop");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
