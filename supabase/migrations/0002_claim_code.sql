-- Código de reclamo para comercios cargados manualmente (relevamiento en la calle, por SQL)
-- sin dueño todavía. El comerciante ingresa el código desde su celular la primera vez que
-- entra al portal, y ese comercio queda vinculado a su sesión (owner_id).

-- 1) owner_id pasa a ser opcional: un comercio cargado por SQL nace sin dueño.
alter table stores alter column owner_id drop not null;

-- 2) columna para el código corto (ej. "CI-4F7B"). Único para poder buscarlo por código.
alter table stores add column if not exists claim_code text unique;

-- 3) función que hace el vínculo. SECURITY DEFINER porque el usuario que reclama
--    todavía no es owner_id de esa fila, así que la policy normal de "dueño escribe
--    su comercio" no lo dejaría hacer el update directo - esta función sí puede,
--    pero solo bajo las condiciones de abajo (código correcto y comercio sin dueño).
create or replace function claim_store(p_claim_code text)
returns stores
language plpgsql
security definer
set search_path = public
as $$
declare
  result stores;
begin
  if auth.uid() is null then
    raise exception 'Necesitás una sesión activa para reclamar un comercio.';
  end if;

  update stores
  set owner_id = auth.uid(),
      updated_at = now()
  where claim_code = p_claim_code
    and owner_id is null
  returning * into result;

  if result.id is null then
    raise exception 'Código inválido o el comercio ya fue reclamado por otro dispositivo.';
  end if;

  return result;
end;
$$;

-- Cualquier usuario logueado (incluye login anónimo) puede intentar reclamar.
grant execute on function claim_store(text) to authenticated;
