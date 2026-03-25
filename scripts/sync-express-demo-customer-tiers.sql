-- Express Demo: Khalid = silver (commuter). Omar has no loyalty badge in UI (handled in app).
UPDATE public.customers SET loyalty_tier = 'silver' WHERE lower(first_name) = 'khalid';
