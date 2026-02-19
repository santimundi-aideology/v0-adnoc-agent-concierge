-- =============================================================
-- Sync demo personas + scenario pricing to latest spec
-- Run in Supabase SQL Editor
-- =============================================================

begin;

-- 1) Remove deprecated personas (Raj, Fatima) and their related rows.
with removed_customers as (
  select id
  from customers
  where lower(first_name) in ('raj', 'fatima')
)
delete from scenario_triggers
where customer_id in (select id from removed_customers);

with removed_customers as (
  select id
  from customers
  where lower(first_name) in ('raj', 'fatima')
)
delete from customer_behavior_profiles
where customer_id in (select id from removed_customers);

do $$
begin
  if to_regclass('public.customer_visits') is not null then
    if to_regclass('public.customer_visit_items') is not null then
      execute $sql$
        delete from customer_visit_items
        where visit_id in (
          select id
          from customer_visits
          where customer_id in (
            select id from customers where lower(first_name) in ('raj', 'fatima')
          )
        )
      $sql$;
    end if;

    execute $sql$
      delete from customer_visits
      where customer_id in (
        select id from customers where lower(first_name) in ('raj', 'fatima')
      )
    $sql$;
  end if;
end
$$;

delete from customers
where lower(first_name) in ('raj', 'fatima');

-- 2) Persona profile alignment for the four active personas.
update customer_behavior_profiles p
set
  favorite_product = case lower(c.first_name)
    when 'ahmed' then 'Flat White (18 dirhams)'
    when 'sarah' then 'Iced Latte (25 dirhams)'
    when 'khalid' then 'Flat White (18 dirhams)'
    when 'omar' then 'Welcome Bundle (coffee + snack, 25 dirhams)'
    else p.favorite_product
  end,
  avg_basket_value = case lower(c.first_name)
    when 'ahmed' then 32
    when 'sarah' then 95
    when 'khalid' then 58
    when 'omar' then 25
    else p.avg_basket_value
  end
from customers c
where p.customer_id = c.id
  and lower(c.first_name) in ('ahmed', 'sarah', 'khalid', 'omar');

-- 3) Deterministic trigger alignment to requested scenarios.
update scenario_triggers st
set trigger_type = case lower(c.first_name)
  when 'sarah' then 'ev_charging_started'
  else 'arrival'
end
from customers c
where st.customer_id = c.id
  and lower(c.first_name) in ('ahmed', 'sarah', 'khalid', 'omar');

-- 4) Keep pricing realistic for scenario services/products.
update products set price = 18 where lower(name) like '%flat white%';
update products set price = 25 where lower(name) like '%iced latte%';
update products set price = 30 where lower(name) like '%interior clean%';
update products set price = 40 where lower(name) like '%express car wash%';

-- Optional cleanup of old promo language if present.
delete from promotions
where lower(name) like '%family bundle%'
   or lower(name) like '%sponsored chocolate%';

commit;
