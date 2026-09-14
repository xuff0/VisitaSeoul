#!/bin/bash
# Levanta un PostgreSQL temporal, aplica la migración y comprueba que el RLS aísle de verdad.
# No hay demonio de Docker en este entorno, pero sí PostgreSQL 16 instalado.
#
# El rol y el auth.uid() de cada consulta se pasan por PGOPTIONS y no como sentencias SQL, para
# que la salida contenga sólo el resultado y no las etiquetas de cada comando.
set -e
PG=/usr/lib/postgresql/16/bin
S="${TMPDIR:-/tmp}/visitaseoul-pgtest"
DATA=$S/pgdata
SOCK=$S/pgsock
A=11111111-1111-1111-1111-111111111111
B=22222222-2222-2222-2222-222222222222
FAILED=

mkdir -p "$S"; chmod o+rx "$S" 2>/dev/null || true
rm -rf "$DATA" "$SOCK"; mkdir -p "$DATA" "$SOCK"; chown -R nobody "$DATA" "$SOCK"

run() { su -s /bin/bash nobody -c "$1"; }
run "$PG/initdb -D $DATA -U postgres -A trust" > /dev/null 2>&1
run "$PG/pg_ctl -D $DATA -o '-k $SOCK -h \"\"' -l $DATA/log -w start" > /dev/null
trap "run '$PG/pg_ctl -D $DATA -m immediate stop' >/dev/null 2>&1 || true" EXIT

# psql como superusuario, para preparar y para aplicar la migración
adm() { run "psql -h $SOCK -U postgres -d postgres -v ON_ERROR_STOP=1 -q $*"; }
# psql como un usuario cualquiera de la app: rol authenticated y su propio auth.uid()
as() { run "PGOPTIONS='-c role=authenticated -c app.uid=$1' psql -h $SOCK -U postgres -d postgres -q -t -A -c \"$2\"" 2>&1; }

adm "-c \"
  set client_min_messages = warning;
  create schema auth;
  create table auth.users (id uuid primary key);
  create role authenticated nologin;
  grant usage on schema auth to authenticated;
  create or replace function auth.uid() returns uuid language sql stable as
    \\\$\\\$ select nullif(current_setting('app.uid', true), '')::uuid \\\$\\\$;
\"" > /dev/null

run "PGOPTIONS='-c client_min_messages=warning' psql -h $SOCK -U postgres -d postgres -q -v ON_ERROR_STOP=1 -f /home/user/VisitaSeoul/supabase/migrations/0001_init.sql" > /dev/null
echo "  ok  la migración se aplica sin errores"

adm "-c \"insert into auth.users values ('$A'), ('$B');\"" > /dev/null

check() { # nombre, uid, sql, esperado
  got=$(as "$2" "$3" | tr -d '[:space:]')
  if [ "$got" = "$4" ]; then echo "  ok  $1"
  else echo "FAIL  $1 — esperaba '$4', obtuve '$got'"; FAILED=1; fi
}

# Cada usuario inserta un lugar propio sin declarar el dueño: lo completa auth.uid().
as "$A" "insert into public.places (id,n,c,z,lat,lng,updated_at) values ('aaaaaaaa-0000-0000-0000-000000000001','Mi hotel','otros','seul',37.55,126.92,now());" > /dev/null
as "$B" "insert into public.places (id,n,c,z,lat,lng,updated_at) values ('bbbbbbbb-0000-0000-0000-000000000001','Su hotel','otros','seul',37.50,127.00,now());" > /dev/null
check "el dueño se completa solo con auth.uid()" "$A" "select owner from public.places;" "$A"

check "cada usuario ve sólo su lugar"   "$A" "select count(*) from public.places;" "1"
check "y ve el suyo, no el del otro"    "$A" "select n from public.places;" "Mihotel"
check "el otro ve el propio"            "$B" "select n from public.places;" "Suhotel"

check "no puede editar lo ajeno" "$A" \
  "with x as (update public.places set n='Secuestrado' where id='bbbbbbbb-0000-0000-0000-000000000001' returning 1) select count(*) from x;" "0"
check "no puede borrar lo ajeno" "$A" \
  "with x as (delete from public.places where id='bbbbbbbb-0000-0000-0000-000000000001' returning 1) select count(*) from x;" "0"
check "el lugar ajeno sigue intacto" "$B" "select n from public.places;" "Suhotel"

if as "$A" "insert into public.places (id,owner,n,c,z,lat,lng,updated_at) values ('cccccccc-0000-0000-0000-000000000001','$B','Suplantado','otros','seul',37.5,127.0,now());" | grep -q "violates row-level security"
then echo "  ok  no puede escribir a nombre de otro"
else echo "FAIL  debería rechazar escribir a nombre de otro"; FAILED=1; fi

# synced_at lo pone el servidor y siempre avanza, aunque el cliente mande updated_at en el pasado.
check "synced_at ignora el reloj del cliente" "$A" \
  "with x as (insert into public.places (id,n,c,z,lat,lng,updated_at) values ('aaaaaaaa-0000-0000-0000-000000000002','Con reloj mal','otros','seul',37.5,127.0,'2001-01-01') returning synced_at) select synced_at > now() - interval '1 minute' from x;" "t"

check "una actualización empuja synced_at hacia adelante" "$A" \
  "with antes as (select synced_at s from public.places where id='aaaaaaaa-0000-0000-0000-000000000002'),
        x as (update public.places set n='Editado' where id='aaaaaaaa-0000-0000-0000-000000000002' returning synced_at)
   select x.synced_at >= antes.s from x, antes;" "t"

# Las lápidas se sincronizan como filas, no como ausencias.
as "$A" "update public.places set deleted_at=now() where id='aaaaaaaa-0000-0000-0000-000000000001';" > /dev/null
check "el borrado lógico sigue visible para poder sincronizarlo" "$A" \
  "select count(*) from public.places where deleted_at is not null;" "1"

# El diff de un precargado se guarda por (owner, seed_id): dos personas editan el mismo sin pisarse.
as "$A" "insert into public.place_overrides (seed_id,patch,updated_at) values ('s-palacio-gyeongbokgung','{\\\"n\\\":\\\"Mi palacio\\\"}',now());" > /dev/null
as "$B" "insert into public.place_overrides (seed_id,patch,updated_at) values ('s-palacio-gyeongbokgung','{\\\"n\\\":\\\"Su palacio\\\"}',now());" > /dev/null
check "dos personas editan el mismo precargado sin pisarse" "$A" \
  "select patch->>'n' from public.place_overrides;" "Mipalacio"

check "el RLS está activo en las siete tablas" "$A" \
  "select count(*) from pg_tables where schemaname='public' and rowsecurity;" "7"
check "hay una política por tabla" "$A" \
  "select count(*) from pg_policies where schemaname='public';" "7"

[ -z "$FAILED" ] && { echo; echo "TODO OK"; } || { echo; echo "HAY FALLAS"; exit 1; }
