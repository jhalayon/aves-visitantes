# Estadísticas de visitantes

La pantalla pública registra una visita única por navegador mediante un identificador aleatorio guardado en
`localStorage`. Las recargas del mismo navegador no incrementan el total más de una vez por día y el servidor guarda
únicamente un hash del identificador, las fechas de primera/última visita y un código de país.

El país se estima en el servidor a partir de la IP mediante [ipwho.is](https://ipwho.is/). La IP no se escribe en el
archivo de estadísticas ni se envía al navegador. Si el servicio de geolocalización no responde, el visitante aparece
como `Desconocido`. El límite publicado para el endpoint gratuito de ipwho.is es de 1.000 consultas diarias por IP.

El contador es acumulado desde que se activa y cuenta también el navegador del propietario. Un visitante que borra el
almacenamiento local, usa otro navegador o navega en modo privado puede contarse nuevamente. La ubicación por IP es
aproximada y no debe interpretarse como una identificación personal.

El estado persistente vive en `runtime/analytics.json`, que está excluido del repositorio. La API interna expone solo:

- `POST /analytics/collect`, para registrar el identificador anónimo.
- `GET /analytics/stats`, para devolver el total y el resumen por país.

La página no carga el panel eBird ni sus datos privados para mostrar estas estadísticas.
