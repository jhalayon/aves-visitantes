# Exportación revisada a eBird

Avian Visitors no publica observaciones automáticamente en eBird. La página `app/ebird.html` agrega una etapa explícita de revisión humana y genera un CSV en el [formato oficial de importación de eBird](https://support.ebird.org/en/support/solutions/articles/48000907878).

```text
BirdNET-Go → filtros de fecha/confianza → revisión humana → CSV → Import Data de eBird
```

## Por qué no se usa la API para publicar

La API pública de eBird está orientada a consultas y descargas de datos. No se utiliza como un endpoint de escritura para crear checklists personales. La publicación se realiza mediante la interfaz de eBird o su herramienta de importación CSV.

## Qué exporta

- Una fila por especie seleccionada.
- Nombre común resuelto por el diccionario argentino de la aplicación.
- Género y especie científicos separados.
- Presencia `X`, porque una detección acústica no estima la cantidad de individuos.
- Fecha, hora de la primera detección, ubicación, protocolo y duración indicados en el formulario.
- Comentarios con la cantidad de detecciones, confianza máxima y rango horario observado.

La casilla “todas las observaciones reportadas” queda desactivada por defecto: una cámara con micrófono no permite afirmar por sí sola que no hubo otras especies. La persona que importa el archivo debe revisar las especies, ubicación, protocolo y campos taxonómicos antes de enviarlo.

## Privacidad y configuración

La ubicación no está escrita en el repositorio público. Se carga en el formulario y los valores se conservan únicamente en `localStorage` del navegador para facilitar usos posteriores. El exportador no necesita una clave de API de eBird ni las credenciales de las cámaras.
