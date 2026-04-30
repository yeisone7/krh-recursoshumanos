-- Opcional: programar notificaciones automáticas con pg_cron/pg_net.
-- Reemplaza PROJECT_REF y ANON_KEY antes de ejecutar.
-- Ejecuta este archivo en SQL Editor después de desplegar las Edge Functions.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Preavisos de contratos: diario 07:00 UTC
select cron.schedule(
  'notify-contract-preaviso-daily',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/notify-contract-preaviso',
    headers := '{"Content-Type":"application/json","apikey":"ANON_KEY"}'::jsonb,
    body := jsonb_build_object('scheduled', true, 'time', now())
  );
  $$
);

-- Alertas de incapacidades: diario 07:10 UTC
select cron.schedule(
  'notify-incapacity-alerts-daily',
  '10 7 * * *',
  $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/notify-incapacity-alerts',
    headers := '{"Content-Type":"application/json","apikey":"ANON_KEY"}'::jsonb,
    body := jsonb_build_object('scheduled', true, 'time', now())
  );
  $$
);

-- Terminaciones pendientes: diario 07:20 UTC
select cron.schedule(
  'notify-pending-terminations-daily',
  '20 7 * * *',
  $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/notify-pending-terminations',
    headers := '{"Content-Type":"application/json","apikey":"ANON_KEY"}'::jsonb,
    body := jsonb_build_object('scheduled', true, 'time', now())
  );
  $$
);
