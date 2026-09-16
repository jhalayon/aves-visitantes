# Nombres comunes argentinos

## Decisión

BirdNET-Go continúa identificando la especie y entregando el nombre científico. Avian Visitors resuelve el nombre que se muestra en pantalla mediante un diccionario local indexado por nombre científico.

La prioridad es:

1. Excepciones locales (`config/names-overrides.json`).
2. Lista argentina sincronizada (`runtime/argentina-names.json`).
3. Traducciones puntuales existentes en `app/config.js`.
4. Nombre común recibido de BirdNET-Go.
5. Nombre científico.

Esto permite mantener la interfaz en funcionamiento aunque la fuente externa no esté disponible, y permite corregir preferencias regionales sin alterar el modelo acústico. También evita pedirle a un modelo de lenguaje que decida un nombre en tiempo de ejecución: Gemini puede servir para proponer una revisión, pero la fuente publicada y una excepción revisada deben ser la autoridad efectiva.

## Fuente principal

El script `scripts/sync_argentina_names.py` consulta la [Lista de Aves de Argentina de CoaRECS](https://www.coarecs.com.ar/argentina/index_csv_sc.php), que publica las columnas de nombre científico y nombre castellano y declara que su lista se compila a partir de referencias de Aves Argentinas y eBird. La fuente puede actualizarse, por lo que se sincroniza durante la operación del servidor y no desde cada navegador.

Como referencia taxonómica y de revisión se conserva la [Checklist de las aves argentinas de Aves Argentinas](https://www.avesargentinas.org.ar/checklist-de-las-aves-argentinas). BirdNET-Go sigue siendo la fuente de identificación y de su taxonomía operativa.

## Actualización

Desde la raíz del repositorio:

```bash
python3 scripts/sync_argentina_names.py
docker compose up -d
```

El resultado se escribe en `runtime/argentina-names.json`, que se monta como contenido estático en `/runtime/`. No debe incluirse ningún usuario, contraseña, token ni URL privada en ese archivo.

## Preferencias locales

Crear `config/names-overrides.json` a partir de `config/names-overrides.example.json` para ajustar nombres de uso local. Las claves deben coincidir con el nombre científico que devuelve BirdNET-Go. Las excepciones se aplican después de la lista argentina y sobreviven a futuras sincronizaciones.

## Consideraciones

- El mismo nombre común puede variar por provincia; más adelante el diccionario puede evolucionar a `provincia -> nombre científico -> nombre`, sin cambiar el identificador de la detección.
- Los cambios taxonómicos pueden modificar el nombre científico. Si aparece ese caso, conviene agregar un alias revisado, no hacer coincidencias aproximadas silenciosas.
- La aplicación conserva el nombre original para auditoría conceptual: solo cambia la etiqueta visible.
