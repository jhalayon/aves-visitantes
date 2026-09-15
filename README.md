# Avian Visitors

Pantalla web para visualizar detecciones acústicas de aves y otros animales a partir de BirdNET-Go. Está pensada para dejarse abierta en un tab de Chrome y se actualiza automáticamente.

## Qué hace

- Consulta las detecciones del BirdNET-Go configurado en el servidor.
- Si hay actividad en los últimos 30 minutos, compone solo esas detecciones.
- Si no hay actividad reciente, conserva las últimas detecciones conocidas para evitar una pantalla vacía.
- Muestra las aves en un collage y los animales del entorno en una sección inferior separada por una línea.
- Traduce los nombres comunes desde `app/config.js`, sin modificar el modelo acústico.
- No incluye credenciales ni datos específicos de la instalación.

## Estructura

```text
app/                          Aplicación web estática y assets visuales
config/cameras.example.yaml  Plantilla de configuración de cámaras
config/birdnet-go.example.yaml Referencia para el stream RTSP
docker-compose.yml            Servidor web/proxy para la pantalla
nginx.conf.template           Proxy de la API de BirdNET-Go
```

## Configurar una cámara

Copiar los ejemplos y completar los valores únicamente en el servidor:

```bash
cp config/cameras.example.yaml config/cameras.yaml
cp config/birdnet-go.example.yaml config/birdnet-go.yaml
chmod 600 config/cameras.yaml config/birdnet-go.yaml
```

En `config/cameras.yaml` se documentan la dirección, el puerto y el path RTSP. Las credenciales deben permanecer solo en el archivo local ignorado por Git. Para BirdNET-Go, usar ese stream en la configuración del contenedor y conservar `mediaMode: audio-only` cuando solo se necesita el micrófono.

El path habitual para estas cámaras es `/onvif1`, pero debe verificarse con el modelo instalado.

## Ejecutar la pantalla

La aplicación espera que BirdNET-Go esté disponible en el host del servidor, por defecto en el puerto `8090`:

```bash
cp .env.example .env
docker compose up -d
```

Luego abrir `http://SERVIDOR:8091`.

Si BirdNET-Go está en otra dirección o puerto, editar `.env`. El proxy solo expone la API necesaria bajo `/birdnet/`; no contiene credenciales.

## Nombres comunes

Las traducciones de los nombres de aves están en `app/config.js`, dentro de `commonNameTranslations`. Si BirdNET-Go devuelve una especie que todavía no está en el diccionario, la interfaz conserva temporalmente el nombre recibido por la API para no ocultar la detección.

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
