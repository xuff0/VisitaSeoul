# Seúl para caminar

Mapa de Seúl con tu ubicación, los sitios que importan y qué conviene comprar para llevar a
Bolivia. Pensado para usarse en la calle, con una mano, y sin señal.

Dos documentos sueltos que no se hablaban entre sí —un mapa de sitios y una guía de precios—
puestos en el mismo lugar: parado frente a la góndola de Olive Young, la app sabe dónde estás
**y** cuánto cuesta eso mismo en Santa Cruz.

## Qué hace

**Del mapa a la ficha.** Tocás un punto y la vista baja a su ficha, que destella al llegar y
queda justo debajo de la barra de filtros. Si ya estaba a la vista no se mueve nada. «Acercar»
hace el camino inverso.

**Mapa.** 141 lugares sobre la red de trenes del área metropolitana, en doce grupos: turismo,
k-beauty, centros comerciales, mercados, electrónica, conveniencia, ópticas, ginseng, medicina,
comida, ropa y otros. Cada uno dice a qué estación queda y a cuántos metros. Tu ubicación en vivo,
filtro por radio (500 m, 1 km, 3 km) y orden por distancia.

**Agregar pegando un enlace y nada más.** Los enlaces cortos que comparte la aplicación de Google
Maps (`maps.app.goo.gl/…`) son un redireccionamiento y no llevan las coordenadas adentro; el
navegador no puede seguirlos por CORS, así que lo hace una ruta del servidor. De lo que vuelve se
completa el nombre, el nombre coreano si viene en hangul, el barrio —deducido del punto contra los
polígonos de los 25 distritos, sin consultar nada— y un grupo sugerido según el nombre. Sólo se
llenan los campos vacíos: lo que ya escribiste manda.

**Editar y eliminar — todo.** No sólo lo que agregás vos: también los 134 que vienen
cargados. De los precargados se guarda sólo el diff, así que si una versión futura corrige la
dirección de una tienda, la corrección te llega igual aunque le hayas cambiado el nombre.
"Restaurar original" deshace tus cambios, y lo que ocultás se puede recuperar desde *Mi viaje*.

**Comprar.** 61 productos con precio en Corea, precio en Bolivia y el multiplicador entre los dos,
ordenados por cuánto conviene traerlos. Conversor ₩ ↔ USD ↔ Bs en ambos sentidos, contador de la
franquicia aduanera de $1.000 con aviso al pasarse, seguimiento del tax refund, avisos de voltaje
para lo que se enchufa, y un botón que busca el precio vigente en Naver Shopping.

Cada precio dice si está **verificado** en tienda o **estimado**. Los de Olive Young cambian todas
las semanas, así que podés anotar el que ves en la góndola y el multiplicador se recalcula con ese.

**Naver.** Todo abre en Naver Maps, que es el mapa que sirve dentro de Corea: marcador exacto en la
app (`nmap://place`), ruta en transporte público desde donde estés, y caída a la web si no tenés la
app instalada. Los nombres van en coreano porque es lo que encuentra el local y lo que entiende el
vendedor.

**Exportar.** Un lugar: compartir, copiar coordenadas, `geo:`, Google Maps. Todos o sólo los
favoritos: GeoJSON, KML con carpetas y colores por categoría, GPX de waypoints y CSV en UTF-8 con
BOM para que Excel no rompa el hangul.

**Sin señal.** Instalable en el teléfono. Precachea las tres pantallas y los datos, y guarda los
mosaicos del mapa que ya miraste. Si igual no hay mosaicos, dibuja Seúl con la geometría que viaja
dentro de la app: el mapa nunca queda en blanco.

## Cómo está hecho

Next.js 16 con App Router y TypeScript, Tailwind 4, Leaflet, Dexie (IndexedDB) y Supabase.

**Local-first.** IndexedDB es la fuente de lectura: la pantalla nunca espera a la red. Cada
escritura entra en la base local y en una cola de salida *en la misma transacción*, y de ahí la
levanta el motor de sincronización cuando hay señal. Ante dos versiones de la misma fila gana la
más reciente; los borrados viajan como lápidas, porque un borrado hecho en el subte también tiene
que poder sincronizar.

**Los datos de la app viven en el repo, no en la base.** Los 134 lugares, las 24 líneas de tren con
sus 644 estaciones y el catálogo de compras se despliegan con el código: carga instantánea, cero
consultas, y funcionan sin señal desde el primer segundo. La base guarda solamente lo tuyo.

```
app/            las tres pantallas, la ruta que resuelve enlaces cortos y el service worker
components/     mapa (Leaflet imperativo), lugares, compras, interfaz
lib/data/       semilla: lugares, red de trenes, geometría de Seúl, catálogo de compras
lib/autofill.ts deducción de barrio, idioma del nombre y grupo sugerido
lib/db/         Dexie y la mezcla de semilla + tus ediciones + tus lugares
lib/sync/       motor de sincronización y adaptador de Supabase
supabase/       migraciones SQL
tests/          unitarias (Vitest), esquema y RLS (Postgres), navegador (Playwright)
```

## Ponerlo a andar

```bash
npm install
npm run dev          # http://localhost:3000
```

Funciona sin configurar nada: sin variables de Supabase corre entero contra IndexedDB y lo dice
en *Mi viaje*.

### Supabase (opcional)

1. Creá un proyecto y habilitá **Anonymous sign-ins** en Authentication → Providers.
2. Aplicá `supabase/migrations/0001_init.sql`, con `supabase db push` o pegándolo en el editor SQL.
3. Copiá `.env.example` a `.env.local` y completá `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`. En proyectos nuevos la segunda aparece como *publishable key*
   (`sb_publishable_…`). Son claves públicas: la `service_role` nunca va acá, porque saltea el RLS.

No hay pantalla de login. La primera vez, la app crea un usuario anónimo real: eso le da a tus
filas un `auth.uid()` con el que el RLS las protege de verdad, en lugar de dejar una tabla abierta
a cualquiera con el enlace. Cuando quieras entrar desde otro teléfono, `updateUser({ email })`
convierte ese mismo usuario en permanente **conservando el id**, así que no se pierde nada.

Mientras tanto, tus datos viven en ese navegador y nada más: si limpiás los datos del sitio, se
van. Por eso el respaldo está a la vista en *Mi viaje* y no escondido en un menú.

### Desplegar en Vercel

Importá el repositorio y cargá las dos variables públicas. Nada más: `npm run build` ya está
configurado. Sin las variables el build pasa igual y la app corre en modo local.

## Pruebas

```bash
npm run typecheck
npm test                     # 96 unitarias: Naver, arbitraje, exportadores, mezcla, sincronización,
                             # autocompletado y las defensas del resolvedor de enlaces
bash tests/rls.sh            # levanta un Postgres temporal y comprueba que el RLS aísle
npm run build && npm start
node tests/verify.mjs        # mapa, filtros, búsqueda en hangul, ubicación
node tests/verify-crud.mjs   # crear, editar, ocultar, restaurar y eliminar
node tests/verify-compras.mjs # catálogo, franquicia, los cuatro formatos de exportación, sin conexión
node tests/verify-autofill.mjs # enlaces cortos, autocompletado y el grupo Medicina
node tests/verify-mapa-ficha.mjs # del punto del mapa a su ficha, en tamaño de teléfono
```

Los cinco `verify*.mjs` necesitan el servidor levantado y usan el Chromium de Playwright. Aceptan
`BASE_URL`, `SHOTS_DIR` para las capturas y `PW_CHROMIUM` para apuntar a un Chromium ya instalado,
útil donde no se pueden descargar navegadores:

```bash
PW_CHROMIUM=/ruta/a/chrome node tests/verify.mjs
```

## Sobre el resolvedor de enlaces

`app/api/resolver` es la única parte que sale a la red desde el servidor, así que es también la
única superficie de SSRF. Las defensas son cuatro: sólo se aceptan enlaces de los acortadores de
Google como punto de entrada, cada salto del redireccionamiento se vuelve a validar contra esa
lista, hay tope de saltos, de tiempo y de bytes leídos, y la respuesta devuelve únicamente las
coordenadas y el nombre —nunca el cuerpo descargado—. Las pruebas cubren cada una de esas puertas.

Como es una consulta en vivo, sin señal no funciona: ahí el formulario lo dice y te ofrece las
salidas de siempre (pegar el enlace largo, escribir las coordenadas, o marcar el punto en el mapa).

## Sobre los datos

Los precios son los de la guía, de la primera semana de septiembre de 2026. Los de Olive Young
cambian todas las semanas por promociones y los de Bolivia varían por tienda y por el tipo de
cambio, que es editable en la app. La fecha de la fuente se muestra siempre, y cada fila dice si el
precio está verificado o estimado, en lugar de presentar todo con la misma confianza.

Las coordenadas de los lugares tienen precisión de manzana. El botón de Naver busca por nombre
coreano, que es lo que resuelve el último tramo de la navegación en Corea; las coordenadas son para
el mapa y la exportación.
