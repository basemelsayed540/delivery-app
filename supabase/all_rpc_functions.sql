-- ================================================================
-- ALL RPC FUNCTIONS — Run this single file in Supabase SQL Editor
-- ================================================================

-- 0. Index: speeds up GROUP BY and .eq('اليومية', ...) queries
CREATE INDEX IF NOT EXISTS idx_invoices_daily ON public.invoices ("اليومية");

-- 1) get_daily_summary — pre-aggregated daily summary for dashboard
CREATE OR REPLACE FUNCTION get_daily_summary()
RETURNS TABLE("اليومية" TEXT, total BIGINT, is_archived BOOLEAN)
LANGUAGE SQL STABLE AS $$
  SELECT
    "اليومية",
    COUNT(*) AS total,
    BOOL_OR(
      COALESCE("ارشيف", '') <> ''
      AND COALESCE("ارشيف", '') <> 'false'
      AND COALESCE("ارشيف", '') <> '0'
    ) AS is_archived
  FROM invoices
  WHERE "اليومية" IS NOT NULL AND "اليومية" <> ''
  GROUP BY "اليومية";
$$;

-- 2) get_archive_summary — status counts + financial totals for archived shipments
CREATE OR REPLACE FUNCTION get_archive_summary()
RETURNS TABLE(status TEXT, cnt BIGINT, paid_sum NUMERIC, commission_sum NUMERIC)
LANGUAGE SQL STABLE AS $$
  SELECT
    COALESCE(NULLIF("الحالة", ''), 'غير محدد') AS status,
    COUNT(*) AS cnt,
    SUM(COALESCE("المدفوع", 0)) FILTER (WHERE "الحالة" IN ('تم', 'تعديل سعر', 'شحن')) AS paid_sum,
    SUM(COALESCE("عمولة المندوب", 0)) FILTER (WHERE "الحالة" IN ('تم', 'تعديل سعر', 'شحن')) AS commission_sum
  FROM invoices
  WHERE COALESCE("ارشيف", '') NOT IN ('', 'false', '0')
  GROUP BY 1;
$$;

-- 3) get_archive_daily_summary — per archived daily breakdown
CREATE OR REPLACE FUNCTION get_archive_daily_summary()
RETURNS TABLE("اليومية" TEXT, cnt BIGINT, remittance NUMERIC)
LANGUAGE SQL STABLE AS $$
  SELECT
    "اليومية",
    COUNT(*) AS cnt,
    SUM(COALESCE("المدفوع", 0)) FILTER (WHERE "الحالة" IN ('تم', 'تعديل سعر', 'شحن'))
      - SUM(COALESCE("عمولة المندوب", 0)) FILTER (WHERE "الحالة" IN ('تم', 'تعديل سعر', 'شحن')) AS remittance
  FROM invoices
  WHERE COALESCE("ارشيف", '') NOT IN ('', 'false', '0')
    AND "اليومية" IS NOT NULL AND "اليومية" <> ''
  GROUP BY "اليومية";
$$;

-- 4) get_archive_rep_summary — rep performance in archived shipments
CREATE OR REPLACE FUNCTION get_archive_rep_summary()
RETURNS TABLE("المندوب" TEXT, cnt BIGINT, commission NUMERIC, remittance NUMERIC)
LANGUAGE SQL STABLE AS $$
  SELECT
    COALESCE(NULLIF("المندوب", ''), 'غير محدد') AS "المندوب",
    COUNT(*) AS cnt,
    SUM(COALESCE("عمولة المندوب", 0)) FILTER (WHERE "الحالة" IN ('تم', 'تعديل سعر', 'شحن')) AS commission,
    SUM(COALESCE("المدفوع", 0)) FILTER (WHERE "الحالة" IN ('تم', 'تعديل سعر', 'شحن'))
      - SUM(COALESCE("عمولة المندوب", 0)) FILTER (WHERE "الحالة" IN ('تم', 'تعديل سعر', 'شحن')) AS remittance
  FROM invoices
  WHERE COALESCE("ارشيف", '') NOT IN ('', 'false', '0')
  GROUP BY 1
  ORDER BY cnt DESC;
$$;

-- 5. GRANT permissions — required for API calls to work
GRANT EXECUTE ON FUNCTION get_daily_summary() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_archive_summary() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_archive_daily_summary() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_archive_rep_summary() TO authenticated, anon;
