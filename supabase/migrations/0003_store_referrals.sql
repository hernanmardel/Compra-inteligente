-- Sistema de referidos: un comercio ya reclamado (con owner_id) puede sumar
-- clientes nuevos que se registran usando su claim_code como código de invitación.
-- Por ahora el punto de entrada (dónde el cliente escanea/ingresa el código) todavía
-- no está en la app - esta migración deja lista la base de datos para cuando se sume.

-- 1) Un registro por cada cliente nuevo que entró referido por un comercio.
--    referred_user_id es unique: cada persona cuenta una sola vez en toda la app,
--    sin importar cuántas veces reingrese el código (evita inflar el conteo).
create table store_referrals (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) not null,
  referred_user_id uuid references auth.users(id) not null unique,
  created_at timestamptz not null default now()
);

-- 2) Historial de hitos alcanzados (cada 10 referidos). Se guarda ahora aunque el
--    beneficio de "semana de oferta destacada" todavía no esté activo, para no
--    perder el conteo histórico del comercio el día que se active.
create table store_referral_rewards (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) not null,
  milestone int not null,          -- 10, 20, 30...
  reached_at timestamptz not null default now(),
  redeemed boolean not null default false,   -- se marca true cuando se le carga la semana destacada
  unique (store_id, milestone)
);

alter table store_referrals enable row level security;
alter table store_referral_rewards enable row level security;

-- El dueño del comercio puede ver sus propios referidos y logros.
create policy "store_referrals_select_own" on store_referrals for select
  using (auth.uid() = (select owner_id from stores where stores.id = store_id));

create policy "store_referral_rewards_select_own" on store_referral_rewards for select
  using (auth.uid() = (select owner_id from stores where stores.id = store_id));

-- 3) Función que registra el referido. La llama el cliente nuevo (autenticado,
-- aunque sea con login anónimo) pasando el claim_code del comercio que lo invitó.
create or replace function register_referral(p_claim_code text)
returns json
language plpgsql
security definer
as $$
declare
  v_store_id uuid;
  v_store_owner uuid;
  v_count int;
  v_new_milestone int;
begin
  if auth.uid() is null then
    raise exception 'Necesitás una sesión activa para registrar el referido.';
  end if;

  select id, owner_id into v_store_id, v_store_owner
  from stores
  where claim_code = upper(trim(p_claim_code));

  if v_store_id is null then
    raise exception 'Código de invitación inválido.';
  end if;

  if v_store_owner = auth.uid() then
    raise exception 'No podés usar tu propio código de invitación.';
  end if;

  -- Si esta persona ya fue referida antes (por este u otro comercio), no se
  -- duplica ni se le cambia el comercio de origen.
  if exists (select 1 from store_referrals where referred_user_id = auth.uid()) then
    return json_build_object('ok', false, 'reason', 'ya_referido');
  end if;

  insert into store_referrals (store_id, referred_user_id)
  values (v_store_id, auth.uid());

  select count(*) into v_count from store_referrals where store_id = v_store_id;

  -- Si el conteo es múltiplo de 10, registra el hito (si no existe ya).
  if v_count % 10 = 0 then
    v_new_milestone := v_count;
    insert into store_referral_rewards (store_id, milestone)
    values (v_store_id, v_new_milestone)
    on conflict (store_id, milestone) do nothing;
  end if;

  return json_build_object('ok', true, 'total_referidos', v_count);
end;
$$;

grant execute on function register_referral(text) to authenticated;
