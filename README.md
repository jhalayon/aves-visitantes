# Avian Visitors

Pantalla web para visualizar detecciones acústicas de aves y otros animales a partir de BirdNET-Go. Está pensada para dejarse abierta en un tab de Chrome y se actualiza automáticamente.

## Qué hace

- Consulta las detecciones del BirdNET-Go configurado en el servidor.
- Si hay actividad en los últimos 30 minutos, compone solo esas detecciones.
- Si no hay actividad reciente, conserva las últimas detecciones conocidas para evitar una pantalla vacía.
- Muestra las aves en un collage y los animales del entorno en una sección inferior separada por una línea.
- Traduce los nombres comunes desde `app/config.js`, sin modificar el modelo acústico.
- Permite abrir la información de cada especie en Wikipedia en castellano desde la tarjeta del collage.
- Incluye `/history.html`, un historial por especie ordenado por última detección.
- No incluye credenciales ni datos específicos de la instalación.

## Estructura

```text
app/                            Aplicación web estática y assets visuales
config/devices.example.yaml    Plantilla unificada de cámaras y dispositivos
config/birdnet-go.example.yaml Referencia para el stream RTSP
docker-compose.yml              Servidor web/proxy para la pantalla
nginx.conf.template             Proxy de la API de BirdNET-Go
```

## Configurar una cámara

Copiar los ejemplos y completar los valores únicamente en el servidor:

```bash
cp config/devices.example.yaml config/devices.yaml
cp config/birdnet-go.example.yaml config/birdnet-go.yaml
chmod 600 config/devices.yaml config/birdnet-go.yaml
```

En `config/devices.yaml` cada fuente tiene un identificador estable (`CAM142`, `POR001`, `MIC001`), tipo, número, dirección IP, protocolo, credenciales, parámetros de audio y ubicación. Las credenciales y las coordenadas reales deben permanecer solo en el archivo local ignorado por Git. Para BirdNET-Go, usar el stream correspondiente y conservar `mediaMode: audio-only` cuando solo se necesita el micrófono.

El path habitual para estas cámaras es `/onvif1`, pero debe verificarse con el modelo instalado.

Los campos `id`, `type`, `number`, `province` y `country` permiten agregar posteriormente filtros por dispositivo, tipo de fuente o provincia sin cambiar el formato de las detecciones. La aplicación web actual está enfocada en una fuente; el filtrado multi-dispositivo será la siguiente capa.

## Ejecutar la pantalla

La aplicación espera que BirdNET-Go esté disponible en el host del servidor, por defecto en el puerto `8090`:

```bash
cp .env.example .env
docker compose up -d
```

Luego abrir `http://SERVIDOR:8091`.

El enlace `Historial de detecciones` abre una subpágina con miniatura, nombre científico, nombre común, última detección y cantidad total. La miniatura de cada fila conserva el enlace a información externa en otra pestaña.

Si BirdNET-Go está en otra dirección o puerto, editar `.env`. El proxy solo expone la API necesaria bajo `/birdnet/`; no contiene credenciales.

## Nombres comunes

Las traducciones de los nombres de aves están en `app/config.js`, dentro de `commonNameTranslations`. Si BirdNET-Go devuelve una especie que todavía no está en el diccionario, la interfaz conserva temporalmente el nombre recibido por la API para no ocultar la detección.

Cada tarjeta utiliza el nombre científico como consulta en Wikipedia en castellano y abre el resultado en otra pestaña. Esto evita depender de que todas las especies tengan exactamente el mismo nombre común traducido.

## Publicar en GitHub

Desde la raíz del repositorio:

```bash
git init
git add .
git status
git commit -m "Add Avian Visitors display"
git branch -M main
git remote add origin URL_DEL_REPOSITORIO
git push -u origin main
```

Antes del primer `git add`, comprobar que los archivos reales de configuración no aparezcan en `git status`.

## Próximos pasos

La capa visual está separada de la ingesta y del clasificador. Esto permite cambiar posteriormente tipografías, composición, animaciones y estilo para acercarlo al proyecto original sin modificar la captura de audio.
