# Exportación revisada a eBird

Avian Visitors no publica observaciones automáticamente en eBird. La página `app/ebird.html` agrega una etapa explícita de revisión humana y genera un CSV en el [formato oficial de importación de eBird](https://support.ebird.org/en/support/solutions/articles/48000907878).

```text
BirdNET-Go → filtros de fecha/confianza → revisión humana → CSV con varios checklists → Import Data de eBird
```

## Por qué no se usa la API para publicar

La API pública de eBird está orientada a consultas y descargas de datos. No se utiliza como un endpoint de escritura para crear checklists personales. La publicación se realiza mediante la interfaz de eBird o su herramienta de importación CSV.

## Varios días en un archivo

El Record Format permite subir varios checklists en un único CSV de hasta 1 MB. Cada observación debe pertenecer a una sola fecha, ubicación y protocolo. La interfaz permite seleccionar una fecha desde y una fecha hasta; aplica el horario elegido a cada día y genera un checklist por día con detecciones que hayan pasado los filtros.

En la interfaz en español de eBird, este archivo debe cargarse seleccionando **Extendido**. Esa opción corresponde al Record Format, donde cada fila es una observación. **Rejilla** corresponde al Checklist Format y espera una estructura distinta, con las columnas A y B vacías y los checklists organizados por columnas.

La hora de inicio de cada checklist es la primera detección aceptada de ese día. Las filas de especies del mismo día comparten ubicación, fecha, protocolo, hora de inicio y duración para que eBird las agrupe como una misma lista. Si se necesitan ubicaciones, protocolos o esfuerzos diferentes, conviene generar archivos separados.

## Qué exporta

- Las 19 columnas del Record Format en el orden documentado, pero sin fila de encabezados: el importador de eBird interpreta cada fila como una observación.
- Una fila por especie seleccionada.
- Nombre común oficial de eBird para Argentina, junto con el género y la especie científicos.
- Género y especie científicos separados.
- Presencia `X`, porque una detección acústica no estima la cantidad de individuos.
- Fecha, hora de inicio diaria, ubicación, protocolo y duración indicados en el formulario.
- Comentarios con el nombre local argentino, cantidad de detecciones, confianza máxima y rango horario observado.
- El campo de todas las observaciones reportadas usa `Y`/`N`, según el formato documentado por eBird.
- Los protocolos exportados son `incidental`, `historical`, `stationary`, `traveling`, `area` o `random`, que son los valores admitidos por el importador.
- La latitud y la longitud son obligatorias y deben expresarse en grados decimales.

El exportador consulta el diccionario oficial de nombres regionales de eBird (`Spanish, Argentina`) mediante el nombre científico. Así evita enviar variantes de BirdNET-Go que eBird puede mostrar como especies desconocidas. La interfaz conserva sus nombres argentinos/locales y los comentarios también los incluyen, pero el campo taxonómico usa el nombre de eBird.

La casilla “todas las observaciones reportadas” queda desactivada por defecto: una cámara con micrófono no permite afirmar por sí sola que no hubo otras especies. La persona que importa el archivo debe revisar las especies, ubicación, protocolo y campos taxonómicos antes de enviarlo.

## Protección del exportador

La página `/ebird.html`, el JavaScript del exportador y el endpoint `/ebird-api/` usan autenticación HTTP Basic de Nginx. El archivo `config/ebird.htpasswd` debe existir solo en el servidor y queda excluido por `.gitignore`. Esto protege la interfaz y la consulta específica del exportador sin quitar el acceso público al collage ni a su endpoint `/birdnet/`, que la pantalla principal ya necesita.

La autenticación HTTP no debe exponerse directamente a Internet sin HTTPS o una VPN, porque las credenciales Basic se transmiten codificadas, no cifradas.

## Privacidad y configuración

La ubicación no está escrita en el repositorio público. Se carga en el formulario y los valores se conservan únicamente en `localStorage` del navegador para facilitar usos posteriores. El exportador no necesita una clave de API de eBird ni las credenciales de las cámaras.
