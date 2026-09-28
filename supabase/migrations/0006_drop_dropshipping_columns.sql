-- PettGo — retiro del dropshipping (cambio de modelo: recomendación de pymes)
-- Revierte las columnas agregadas por la migración de sincronización con
-- AliExpress (0006_dropshipping_sync.sql), que nunca se llegó a usar en producción.

alter table public.products
  drop column if exists price_clp,
  drop column if exists category,
  drop column if exists available,
  drop column if exists active,
  drop column if exists aliexpress_product_id,
  drop column if exists trend_score,
  drop column if exists last_synced_at;
