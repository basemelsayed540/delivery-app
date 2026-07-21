-- 1) Archive summary: status counts + financial totals
create or replace function get_archive_summary()
returns table(
  status text,
  cnt bigint,
  paid_sum numeric,
  commission_sum numeric
)
language sql stable as $$
  select
    coalesce(nullif("الحالة", ''), 'غير محدد') as status,
    count(*) as cnt,
    sum(coalesce("المدفوع", 0)) filter (
      where "الحالة" in ('تم', 'تعديل سعر', 'شحن')
    ) as paid_sum,
    sum(coalesce("عمولة المندوب", 0)) filter (
      where "الحالة" in ('تم', 'تعديل سعر', 'شحن')
    ) as commission_sum
  from invoices
  where coalesce("ارشيف", '') not in ('', 'false', '0')
  group by 1;
$$;

-- 2) Per archived daily breakdown
create or replace function get_archive_daily_summary()
returns table("اليومية" text, cnt bigint, remittance numeric)
language sql stable as $$
  select
    "اليومية",
    count(*) as cnt,
    sum(coalesce("المدفوع", 0)) filter (where "الحالة" in ('تم', 'تعديل سعر', 'شحن'))
      - sum(coalesce("عمولة المندوب", 0)) filter (where "الحالة" in ('تم', 'تعديل سعر', 'شحن')) as remittance
  from invoices
  where coalesce("ارشيف", '') not in ('', 'false', '0') and "اليومية" is not null and "اليومية" <> ''
  group by "اليومية";
$$;

-- 3) Rep performance in archived shipments
create or replace function get_archive_rep_summary()
returns table("المندوب" text, cnt bigint, commission numeric, remittance numeric)
language sql stable as $$
  select
    coalesce(nullif("المندوب", ''), 'غير محدد') as "المندوب",
    count(*) as cnt,
    sum(coalesce("عمولة المندوب", 0)) filter (where "الحالة" in ('تم', 'تعديل سعر', 'شحن')) as commission,
    sum(coalesce("المدفوع", 0)) filter (where "الحالة" in ('تم', 'تعديل سعر', 'شحن'))
      - sum(coalesce("عمولة المندوب", 0)) filter (where "الحالة" in ('تم', 'تعديل سعر', 'شحن')) as remittance
  from invoices
  where coalesce("ارشيف", '') not in ('', 'false', '0')
  group by 1
  order by cnt desc;
$$;
