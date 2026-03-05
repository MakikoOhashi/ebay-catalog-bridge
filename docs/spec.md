# ebay-catalog-bridge v1 仕様書

## 0. 概要

ebay-catalog-bridge は、最大4つのeBay sellerアカウントの商品情報を、1つのShopifyストアに対して **一方向（eBay → Shopify）**で同期するShopify埋め込みアプリである。
目的は、ドロップシッパー/越境EC運用における「複数eBayアカウントのカタログ集約」と「同期の安定運用」を提供すること。

## 1. ゴール

- Shopify 1ストアに対して、eBay最大4アカウントのカタログを集約できる
- 同期は eBay → Shopify のみ（eBayを変更しない）
- eBayのリスティングID（ItemID）が揺れても、SKU主キーで安定して追跡できる
- 4万SKU規模でも、バッチ分割＋checkpointで止まらず回る
- eBay側で在庫0になっても、Shopify商品は削除せず sold out表示で残す
- eBay在庫が復活（0→1+）したら、Shopifyも復活できる

## 2. 非ゴール（v1ではやらない）

- Shopifyで売れた在庫をeBayに戻す（双方向在庫同期）
- 注文・出荷・売上計上の統合（チャネル別運用を前提）
- Shipping feeの同期（不可能/非対応）
- 自動FXレート参照（v1は固定レートのみ）
- 同一SKUを複数eBayアカウントから統合してマージ（v1は衝突として停止）

## 3. 想定ユーザー / ユースケース

- 複数eBayアカウントで商品を出しているドロップシッパー
- Shopifyは「販売チャネル」または「カタログ展示/販売」用途
- eBay側の再出品/30日更新などでItemIDが変わりうる運用

## 4. 同期の基本方針（重要）

### 4.1 同期方向

- One-way: eBay → Shopify
- eBayへ書き込みは行わない（在庫調整も含む）

### 4.2 主キー

- **SKUを主キー（SoTキー）**として同期する
- ItemIDは補助情報として保持する（参照/URL生成に利用）

### 4.3 トリガ方式

- eBayからの「シグナル」に依存しない
- **定期ポーリング（cron + worker）**で常に現状を比較して追随する
- 過去の変更を遡れない問題を回避する

## 5. 同期対象データ（Catalog）

### 5.1 同期対象（v1）

- Title
- Description（HTML）
- Images
- Price（設定でON/OFF）
- Stock（在庫） ※eBay→Shopifyのみ
- Weight（重量）

### 5.2 同期対象外（v1）

- Shipping fee（非対応）
- Orders / Customers / Fulfillment

## 6. 在庫同期ポリシー（確定）

### 6.1 eBay在庫 → Shopify在庫

- eBay quantity = 0
  - Shopify商品は削除しない
  - Shopifyは activeのまま在庫0（sold out）
- eBay quantity >= 1
  - Shopify在庫を eBayに追従（再販可能）

### 6.2 Shopifyで売れた在庫 → eBay

- 行わない（v1）
- 将来：Inventory Tasks（手動タスク化）で支援（v1.5）

## 7. eBayに存在しない商品（確定）

- eBay側で見つからなくなったSKUは、Shopify側で削除しない
- Shopify側は
  - 在庫0（sold out）
  - sync_status = missing_on_ebay を記録

※欠損判定は「フル走査一周で未検出だったSKU」をmissing確定とする方式が安定。

## 8. Multiアカウント運用

### 8.1 最大接続数

- 1 Shopify store あたり eBay account 最大 4

### 8.2 SKU衝突（確定）

同一SKUが複数eBayアカウントから発見された場合：

- 当該SKUは 同期停止（更新しない）
- Conflictとして記録・表示
- エラー通知（オプション）

目的：事故（誤上書き・在庫破綻・価格破綻）を回避。

## 9. 価格と通貨（USD→JPY事故対策）

### 9.1 価格同期のスイッチ

- Price sync: ON/OFF

### 9.2 ONの場合の必須仕様

- 通貨変換を必ず実行する
- v1は 固定レート方式のみ
- 例：1 USD = 150 JPY
- 丸めルールは設定可能（v1は最小でOK）

### 9.3 将来拡張（v1.1+）

- 自動FX（外部参照）
- 割引/マークアップ（%）
- 価格帯別ルール

## 10. GTC（Good ’Til Cancelled）

- v1では必須にしない
- 運用ガイドで強く推奨（ItemIDの揺れ・再出品対策）

## 11. データモデル（DB: Postgres 推奨）

### 11.1 stores

- id (pk)
- shop (unique)
- created_at

### 11.2 ebay_accounts

- id (pk)
- store_id (fk)
- label
- ebay_user_id（可能なら）
- refresh_token（暗号化推奨）
- scopes
- status（connected/revoked/error）
- created_at, updated_at

### 11.3 sku_links（SKUを中心に紐付け）

- id (pk)
- store_id (fk)
- sku (index, unique per store)
- ebay_account_id (fk)
- ebay_item_id（補助）
- ebay_variation_key（nullable）
- ebay_last_modified（timestamp）
- shopify_product_id
- shopify_variant_id
- sync_status（ok/skipped/conflict/missing_on_ebay/error）
- last_sync_at
- last_error

制約

- unique(store_id, sku)（SKUは1ストアで唯一のSoT）

### 11.4 sku_conflicts

- id (pk)
- store_id
- sku
- found_in_accounts（jsonb）
- first_detected_at
- last_detected_at
- status（open/resolved）
- note

### 11.5 sync_checkpoint

- ebay_account_id (unique)
- cursor
- mode（rolling/full）
- updated_at
- last_error

### 11.6 sync_runs / sync_errors

- run単位ログと、item単位のエラー記録

## 12. Shopify側メタフィールド（デバッグ/可視化）

- namespace: ebay
- ebay.account_id
- ebay.item_id
- ebay.last_modified
- ebay.sync_status
- ebay.source_url

※DBが正、Shopifyは「表示＋デバッグ」用途。

## 13. 同期ジョブ仕様

### 13.1 実行単位（chunk）

- 1チャンク：200〜500 items（初期200推奨）
- 目標実行時間：30秒〜2分
- レート制限に応じて自動スロットリング

### 13.2 処理手順（1チャンク）

1. eBay APIでcursorページ取得
2. 各itemからSKU抽出（空ならerror）
3. sku_links を参照し衝突判定
4. 差分判定（last_modified比較）
5. Shopify upsert（create or update）
6. Shopify metafield更新（任意）
7. DB更新（last_sync_at, status, checkpoint）

### 13.3 missing検出

- rolling scan一周で「未検出SKU」をmissing確定 → Shopify在庫0

### 13.4 リトライ

- 429/5xxは指数バックオフでリトライ
- idempotent（同じSKUを再処理しても壊れない）

## 14. API / エンドポイント（アプリ内部）

### 14.1 外部監視/cron

- GET /health：200のみ（超軽量）
- POST /jobs/enqueue-sync：enqueueのみ（即200）
- 認証：固定トークン or HMAC

### 14.2 Shopify Webhooks

- v1：必須webhookなし（インストール/アンインストール除く）
- v1.5：orders/create → inventory task作成（enqueueして即200）

## 15. 管理UI（Shopify Admin Embedded）

### 15.1 Settings

- eBayアカウント接続（最大4）
- 同期頻度（10/30/60分など）
- 同期対象フィールド（title/desc/images/weight/stock/price）
- 価格同期ON時：固定FXレート、丸め
- エラー通知先メール（成功通知なし）

### 15.2 Sync Status

- 最終実行、処理件数
- account別checkpoint（cursor/進捗）
- 直近エラー一覧

### 15.3 Conflicts

- SKU衝突一覧（open/resolved）
- どのアカウント同士で衝突したか
- 解消メモ

## 16. セキュリティ

- eBay OAuth refresh_tokenは暗号化して保存（漏洩前提）
- scopesは最小
- webhook/cron endpointは署名で保護
- 機密情報はenv/secretsで管理（コードに埋めない）

## 17. 運用・通知

- 成功通知：不要
- エラー通知：必要（認証切れ、連続失敗、衝突急増など）
- ログ：run単位＋SKU単位で記録

## 18. 既知のリスクと対策（実装前に明示）

- SKUが安定していない出品システム：非対応（警告）
- Variationが複雑でSKUが商品単位に一致しない：v1は「SKU=variant」前提（拡張余地を残す）
- 大量初期取り込み：chunk + checkpointで徐々に反映（必要ならBulk導入はv1.1）

## 付録A：決定事項（あなたの回答で確定）

- Shopify→eBay在庫戻し：しない（タスク化は後）
- SKU衝突：止める＋詳細アラート
- 価格同期：変換必須、v1は固定レートで後で拡張
- GTC：必須にしないが推奨
- eBayに無い商品：削除せずsold out
