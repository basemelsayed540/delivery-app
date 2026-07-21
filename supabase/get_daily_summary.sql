-- ================================================================
-- RPC Function: get_daily_summary()
-- Purpose: Replace client-side pagination in _fetchDailyOptions()
--          Returns pre-aggregated daily summary from the server
--          instead of downloading all invoice rows to the browser.
-- ================================================================
-- IMPORTANT: This function hardcodes the table name "invoices".
-- If you changed the table name via Dev Settings, update the
-- FROM clause below to match your actual table name.
-- ================================================================

-- 1. Index: speeds up GROUP BY and .eq('اليومية', ...) queries
CREATE INDEX IF NOT EXISTS idx_invoices_daily ON public.invoices ("اليومية");

-- 2. RPC function: returns one row per daily with count + archive status
CREATE OR REPLACE FUNCTION get_daily_summary()
RETURNS TABLE("اليومية" TEXT, total BIGINT, is_archived BOOLEAN)
LANGUAGE SQL STABLE AS $$
  SELECT
    "اليومية",
    COUNT(*) AS total,
    -- A daily is "archived" if ANY of its items has a truthy archive value.
    -- bool_or returns true if ANY row satisfies the condition.
    -- This matches the original JS logic in _fetchDailyOptions:
    --   if (isArch) dailyMap.set(d, true);
    --   if (!dailyMap.has(d)) dailyMap.set(d, false);
    BOOL_OR(
      COALESCE("ارشيف", '') <> ''
      AND COALESCE("ارشيف", '') <> 'false'
      AND COALESCE("ارشيف", '') <> '0'
    ) AS is_archived
  FROM invoices
  WHERE "اليومية" IS NOT NULL AND "اليومية" <> ''
  GROUP BY "اليومية";
$$;
