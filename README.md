# Avian Visitors

Avian Visitors es una pantalla web para monitoreo bioacústico. Toma el audio captado por cámaras de seguridad IP con micrófono —y puede incorporar porteros IP o micrófonos de red—, lo envía a BirdNET-Go para identificar aves y compone una vista visual con las detecciones recientes.

Está pensada para ejecutarse en un Linux server y dejarse abierta en un tab de Chrome. La pantalla se actualiza automáticamente cada cinco minutos.

## Qué hace

- Recibe audio desde el stream RTSP de cámaras de seguridad IP u otros dispositivos acústicos configurados.
- Usa BirdNET-Go como motor de análisis acústico e identificación de especies.
- Consulta las detecciones de BirdNET-Go a través de su API, sin modificar el clasificador ni los registros originales.
- Si hay actividad en los últimos 30 minutos, compone solo esas detecciones.
- Si no hay actividad reciente, conserva las últimas detecciones conocidas para evitar una pantalla vacía.
- Muestra las aves identificadas en un collage y los animales del entorno en una sección inferior separada.
- Resuelve nombres comunes argentinos mediante un diccionario local basado en la lista de CoaRECS, con fallback a los nombres españoles de BirdNET-Go.
- Permite abrir información externa de cada especie en Wikipedia en castellano desde la tarjeta del collage.
- Incluye un historial por especie ordenado por última detección, con miniatura, nombre científico, nombre común, timestamp y cantidad.
- Separa la configuración de dispositivos de la interfaz para poder sumar cámaras, porteros IP y micrófonos.

El audio es el diferenciador central del proyecto: la fuente de escucha no es un navegador ni un micrófono conectado a la computadora que muestra la página, sino un dispositivo de seguridad o sensor de red ubicado en el entorno monitoreado.

## Flujo del sistema

```text
Cámara IP / portero IP / micrófono de red
              │ audio RTSP
              ▼
          BirdNET-Go
       identificación acústica
              │ API HTTP
              ▼
        Avian Visitors
     collage + historial web
```

## Arquitectura

- `app/`: interfaz web estática, collage, historial, exportador revisado a eBird y assets visuales.
- `config/`: ejemplos de configuración para dispositivos y BirdNET-Go.
- `scripts/`: tareas operativas, incluyendo la sincronización de nombres argentinos.
- `analytics/`: servicio mínimo de visitantes únicos y resumen de países, sin almacenar IPs.
- `docs/`: decisiones de diseño y fuentes de datos.
- `docker-compose.yml`: servidor Nginx y proxy hacia la API de BirdNET-Go.
- `nginx.conf.template`: configuración del proxy bajo `/birdnet/`.

Las cinco imágenes simples de la primera prueba visual se incluyen como referencia pública en
`app/assets/art-original/`. Las variantes artísticas posteriores, usadas por la instalación privada,
se mantienen fuera del repositorio y están excluidas mediante `.gitignore`.

La aplicación actual está enfocada en una fuente, pero el formato de configuración ya contempla múltiples dispositivos mediante identificadores como `CAM142`, `POR001` y `MIC001`, además de tipo, IP, protocolo, ubicación, provincia y país.

## Visitantes de la pantalla pública

La pantalla principal incluye un indicador acumulado de visitantes únicos y una tabla por país. El contador usa un
identificador aleatorio del navegador, anonimizado mediante hash en el servidor; no guarda direcciones IP. El país es
una estimación aproximada realizada por el servicio de geolocalización configurado en el servicio `avian-analytics`.
El detalle técnico y las limitaciones están en [docs/analytics.md](docs/analytics.md).

## Requisitos

- Linux server o entorno compatible con Docker Compose.
- BirdNET-Go ejecutándose y accesible por HTTP.
- Una cámara IP, portero IP o micrófono de red con stream de audio RTSP.
- Navegador moderno para visualizar la pantalla.

BirdNET-Go debe encargarse de la captura y análisis del audio. Avian Visitors consulta y presenta sus resultados; no procesa directamente el stream RTSP en el navegador.

## Configurar una cámara o dispositivo

Copiar los ejemplos y completar los valores únicamente en el servidor:

```bash
cp config/devices.example.yaml config/devices.yaml
cp config/birdnet-go.example.yaml config/birdnet-go.yaml
cp .env.example .env
chmod 600 config/devices.yaml config/birdnet-go.yaml .env
```

En `config/devices.yaml` cada fuente tiene un identificador estable (`CAM142`, `POR001`, `MIC001`), tipo, número, dirección IP, protocolo, credenciales, parámetros de audio y ubicación. Para BirdNET-Go, usar el stream correspondiente y conservar `mediaMode: audio-only` cuando solo se necesita el micrófono.

El path habitual para algunas cámaras es `/onvif1`, pero debe verificarse para cada modelo instalado. Los campos `id`, `type`, `number`, `province` y `country` permitirán agregar filtros por dispositivo, tipo de fuente o provincia en una futura versión.

## Ejecutar la pantalla

La aplicación espera que BirdNET-Go esté disponible en el host del servidor, por defecto en el puerto `8090`:

```bash
docker network create avian-net 2>/dev/null || true
docker compose up -d
```

Luego abrir `http://SERVIDOR:8091`.

El enlace `Historial de detecciones` abre una subpágina con el resumen de especies registradas. La miniatura de cada fila conserva el enlace a información externa en otra pestaña.

## Preparar un registro para eBird

El enlace `Preparar CSV para eBird` consulta las detecciones de BirdNET-Go, aplica filtros de fechas, horario, confianza y cantidad mínima, y muestra una lista para revisión humana. Después genera un único CSV compatible con la herramienta oficial de importación de eBird, incluso cuando incluye varios días; no publica observaciones automáticamente ni envía credenciales a eBird.

El flujo es:

```text
BirdNET-Go → selección y revisión → Descargar CSV → eBird / Enviar / Importar datos
```

La exportación usa `X` para indicar presencia, porque el análisis acústico no permite inferir de forma confiable la cantidad de individuos. Cada día se representa como un checklist independiente dentro del archivo. En la pantalla de importación de eBird hay que elegir el formato **Extendido**, no **Rejilla**. El CSV usa el nombre común oficial de eBird para Argentina, obtenido por nombre científico, junto con el género y la especie científicos; el nombre local de la interfaz se conserva en los comentarios. Así se evitan variantes de BirdNET-Go que eBird podría marcar como desconocidas. La ubicación, provincia, protocolo y duración se completan en la página y se guardan únicamente en el navegador. Ver los detalles en [docs/ebird-export.md](docs/ebird-export.md).

Si BirdNET-Go está en otra dirección o puerto, editar `.env`. El proxy solo expone la API necesaria bajo `/birdnet/`; no contiene credenciales.

## Nombres comunes argentinos

La interfaz resuelve el nombre común con esta prioridad:

1. `config/names-overrides.json`, para preferencias locales o correcciones.
2. `runtime/argentina-names.json`, generado desde la lista argentina de CoaRECS.
3. `commonNameTranslations` en `app/config.js`, para compatibilidad con datos existentes.
4. El nombre común recibido de BirdNET-Go y, finalmente, el nombre científico.

Para actualizar el diccionario desde el servidor:

```bash
python3 scripts/sync_argentina_names.py
```

La decisión y las fuentes se documentan en [docs/argentina-names.md](docs/argentina-names.md). Gemini puede ayudar a proponer correcciones, pero no se utiliza como autoridad automática en tiempo de ejecución.

## Seguridad y publicación

Este repositorio está preparado para ser público:

- No contiene contraseñas, tokens, claves SSH, IPs privadas reales ni coordenadas de la instalación.
- `.env`, `config/devices.yaml`, `config/birdnet-go.yaml`, `config/names-overrides.json` y `runtime/` están excluidos por `.gitignore`.
- Los archivos `*.example.*` contienen únicamente valores de referencia.
- Antes de cada publicación conviene comprobar `git status` y revisar los archivos nuevos.

Nunca usar los archivos de ejemplo para almacenar credenciales reales en un commit.

El exportador eBird está protegido por autenticación HTTP de Nginx. El archivo `config/ebird.htpasswd` es local al servidor y está excluido del repositorio; no se debe reemplazar por una clave escrita en `app/config.js` o en JavaScript.

## Fuentes y contenido de terceros

- [BirdNET-Go](https://github.com/tphakala/birdnet-go) aporta el motor de identificación y su API.
- [CoaRECS — Lista de Aves de Argentina](https://www.coarecs.com.ar/argentina/index_csv_sc.php) aporta el diccionario argentino sincronizable.
- [Aves Argentinas — Checklist de las aves argentinas](https://www.avesargentinas.org.ar/checklist-de-las-aves-argentinas) se utiliza como referencia taxonómica.
- Las imágenes de aves son servidas por BirdNET-Go y los enlaces informativos apuntan a Wikipedia; esos contenidos y sus licencias pertenecen a sus respectivos autores o servicios.
- El logo personal se carga desde el sitio de Jorge Alayón y no forma parte de los assets originales licenciados del proyecto.

## Licencia

El código y los assets originales de Avian Visitors se distribuyen bajo la [licencia MIT](LICENSE).

La licencia MIT de este repositorio no otorga derechos adicionales sobre BirdNET-Go, Wikipedia, las imágenes remotas, la lista de CoaRECS ni el logo personal. Consultar las condiciones de cada fuente antes de redistribuir sus contenidos.

## Contribuir

Las mejoras de la interfaz, nuevos adaptadores de dispositivos, fuentes de nombres regionales y correcciones de documentación son bienvenidas. Evitar incluir datos de instalaciones privadas, credenciales o grabaciones de audio en issues y pull requests.

## Próximos pasos

La capa visual está separada de la ingesta y del clasificador. Esto permite sumar filtros por dispositivo/provincia y acercar la estética al proyecto original sin modificar la captura de audio ni el modelo acústico.
